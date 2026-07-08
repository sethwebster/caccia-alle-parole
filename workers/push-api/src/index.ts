interface Env {
	DB: D1Database;
}

type TokenPayload = {
	deviceId: string;
	token: string;
	platform: 'ios' | 'android';
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXPO_TOKEN_RE = /^ExponentPushToken\[.+\]$/;

function parsePayload(body: unknown): TokenPayload | null {
	if (typeof body !== 'object' || body === null) return null;
	const { deviceId, token, platform } = body as Record<string, unknown>;
	if (typeof deviceId !== 'string' || !UUID_RE.test(deviceId)) return null;
	if (typeof token !== 'string' || !EXPO_TOKEN_RE.test(token)) return null;
	if (platform !== 'ios' && platform !== 'android') return null;
	return { deviceId, token, platform };
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'POST' && url.pathname === '/v1/push-tokens') {
			const payload = parsePayload(await request.json().catch(() => null));
			if (!payload) return Response.json({ error: 'invalid payload' }, { status: 400 });

			await env.DB.prepare(
				`INSERT INTO push_tokens (device_id, token, platform)
				 VALUES (?1, ?2, ?3)
				 ON CONFLICT (device_id) DO UPDATE
				 SET token = ?2, platform = ?3, updated_at = datetime('now')`,
			)
				.bind(payload.deviceId, payload.token, payload.platform)
				.run();
			return Response.json({ ok: true });
		}

		const deleteMatch =
			request.method === 'DELETE' && url.pathname.match(/^\/v1\/push-tokens\/([0-9a-f-]{36})$/i);
		if (deleteMatch) {
			await env.DB.prepare('DELETE FROM push_tokens WHERE device_id = ?1')
				.bind(deleteMatch[1])
				.run();
			return Response.json({ ok: true });
		}

		return Response.json({ error: 'not found' }, { status: 404 });
	},
} satisfies ExportedHandler<Env>;
