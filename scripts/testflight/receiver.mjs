const MAX_BYTES = 64 * 1024;

async function readBounded(request) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new Error('oversized');
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  return body;
}

export async function receive(request, env, fetcher = fetch) {
  if (new URL(request.url).pathname !== '/testflight') return new Response('Not found', { status: 404 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!env.APPLE_WEBHOOK_SECRET || !env.GITHUB_DISPATCH_TOKEN) return new Response('Not configured', { status: 503 });
  const signature = request.headers.get('x-apple-signature')?.match(/^hmacsha256=([a-f0-9]{64})$/i)?.[1];
  if (!signature) return new Response('Unauthorized', { status: 401 });
  let body;
  try { body = await readBounded(request); }
  catch { return new Response('Payload too large', { status: 413 }); }
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.APPLE_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const bytes = Uint8Array.from(signature.match(/../g), pair => parseInt(pair, 16));
  if (!await crypto.subtle.verify('HMAC', key, bytes, body)) return new Response('Unauthorized', { status: 401 });
  let event;
  try { event = JSON.parse(new TextDecoder().decode(body)).data; }
  catch { return new Response('Invalid JSON', { status: 400 }); }
  if (event?.type !== 'betaFeedbackCrashSubmissionCreated') return new Response('Ignored', { status: 200 });
  if (event.version !== 1 || typeof event.id !== 'string' || !event.id || event.id.length > 128 ||
      event.relationships?.instance?.data?.type !== 'betaFeedbackCrashSubmissions' ||
      !/^[\w-]{1,128}$/.test(event.relationships?.instance?.data?.id ?? '')) {
    return new Response('Invalid crash event', { status: 400 });
  }
  // Dispatch a complete app-scoped reconciliation. Coalesced/replayed webhooks are safe:
  // the collector deduplicates reports and reserves each signature before investigation.
  // Never use a URL, repository, branch, or command supplied in the webhook payload.
  try {
    const response = await fetcher('https://api.github.com/repos/sethwebster/caccia-alle-parole/actions/workflows/testflight-crashes.yml/dispatches', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'caccia-testflight-webhook', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main' }),
      redirect: 'manual', signal: AbortSignal.timeout(8000),
    });
    if (response.status !== 204) {
      console.error(JSON.stringify({ event: 'dispatch_failed', status: response.status }));
      return new Response('Dispatch unavailable', { status: 503 });
    }
    console.log(JSON.stringify({ event: 'crash_workflow_dispatched' }));
    return new Response('Accepted', { status: 202 });
  } catch (error) {
    console.error(JSON.stringify({ event: 'dispatch_unavailable', kind: error?.name }));
    return new Response('Dispatch unavailable', { status: 503 });
  }
}

export default { fetch: (request, env) => receive(request, env) };
