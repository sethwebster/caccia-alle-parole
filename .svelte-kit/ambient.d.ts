
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```sh
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const AUTOJUMP_ERROR_PATH: string;
	export const NoDefaultCurrentDirectoryInExePath: string;
	export const npm_config_legacy_peer_deps: string;
	export const CLAUDE_CODE_ENTRYPOINT: string;
	export const TERM_PROGRAM: string;
	export const NODE: string;
	export const npm_config_audit: string;
	export const AUTOJUMP_SOURCED: string;
	export const INIT_CWD: string;
	export const VK_WORKSPACE_ID: string;
	export const ASDF_DIR: string;
	export const SHELL: string;
	export const TERM: string;
	export const WARP_HONOR_PS1: string;
	export const HOMEBREW_REPOSITORY: string;
	export const TMPDIR: string;
	export const npm_config_fetch_timeout: string;
	export const npm_config_global_prefix: string;
	export const TERM_PROGRAM_VERSION: string;
	export const VK_PROJECT_NAME: string;
	export const COLOR: string;
	export const npm_config_fetch_retries: string;
	export const npm_config_noproxy: string;
	export const PNPM_HOME: string;
	export const ZSH: string;
	export const npm_config_local_prefix: string;
	export const GIT_EDITOR: string;
	export const USER: string;
	export const LS_COLORS: string;
	export const COMMAND_MODE: string;
	export const npm_config_globalconfig: string;
	export const npm_config_prefer_online: string;
	export const SSH_AUTH_SOCK: string;
	export const WARP_IS_LOCAL_SHELL_SESSION: string;
	export const __CF_USER_TEXT_ENCODING: string;
	export const npm_execpath: string;
	export const PAGER: string;
	export const VIRTUAL_ENV_DISABLE_PROMPT: string;
	export const WARP_USE_SSH_WRAPPER: string;
	export const LSCOLORS: string;
	export const PATH: string;
	export const VK_WORKSPACE_BRANCH: string;
	export const _: string;
	export const LaunchInstanceID: string;
	export const npm_package_json: string;
	export const __CFBundleIdentifier: string;
	export const npm_config_init_module: string;
	export const npm_config_userconfig: string;
	export const PWD: string;
	export const npm_command: string;
	export const OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: string;
	export const EDITOR: string;
	export const npm_lifecycle_event: string;
	export const ANDROID_SDK: string;
	export const LANG: string;
	export const npm_package_name: string;
	export const npm_config_progress: string;
	export const XPC_FLAGS: string;
	export const npm_config_npm_version: string;
	export const npm_config_node_gyp: string;
	export const XPC_SERVICE_NAME: string;
	export const npm_package_version: string;
	export const npm_config_yes: string;
	export const HOME: string;
	export const SHLVL: string;
	export const npm_config_fetch_retry_maxtimeout: string;
	export const HOMEBREW_PREFIX: string;
	export const LESS: string;
	export const LOGNAME: string;
	export const npm_config_cache: string;
	export const npm_lifecycle_script: string;
	export const VK_TASK_ID: string;
	export const COREPACK_ENABLE_AUTO_PIN: string;
	export const SSH_SOCKET_DIR: string;
	export const npm_config_fund: string;
	export const BUN_INSTALL: string;
	export const npm_config_user_agent: string;
	export const HOMEBREW_CELLAR: string;
	export const INFOPATH: string;
	export const PROMPT_EOL_MARK: string;
	export const OSLogRateLimit: string;
	export const CONDA_CHANGEPS1: string;
	export const CLAUDECODE: string;
	export const SECURITYSESSIONID: string;
	export const VK_PROJECT_ID: string;
	export const COLORTERM: string;
	export const npm_config_prefix: string;
	export const npm_node_execpath: string;
	export const NODE_ENV: string;
}

/**
 * Similar to [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).
 * 
 * This module cannot be imported into client-side code.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		AUTOJUMP_ERROR_PATH: string;
		NoDefaultCurrentDirectoryInExePath: string;
		npm_config_legacy_peer_deps: string;
		CLAUDE_CODE_ENTRYPOINT: string;
		TERM_PROGRAM: string;
		NODE: string;
		npm_config_audit: string;
		AUTOJUMP_SOURCED: string;
		INIT_CWD: string;
		VK_WORKSPACE_ID: string;
		ASDF_DIR: string;
		SHELL: string;
		TERM: string;
		WARP_HONOR_PS1: string;
		HOMEBREW_REPOSITORY: string;
		TMPDIR: string;
		npm_config_fetch_timeout: string;
		npm_config_global_prefix: string;
		TERM_PROGRAM_VERSION: string;
		VK_PROJECT_NAME: string;
		COLOR: string;
		npm_config_fetch_retries: string;
		npm_config_noproxy: string;
		PNPM_HOME: string;
		ZSH: string;
		npm_config_local_prefix: string;
		GIT_EDITOR: string;
		USER: string;
		LS_COLORS: string;
		COMMAND_MODE: string;
		npm_config_globalconfig: string;
		npm_config_prefer_online: string;
		SSH_AUTH_SOCK: string;
		WARP_IS_LOCAL_SHELL_SESSION: string;
		__CF_USER_TEXT_ENCODING: string;
		npm_execpath: string;
		PAGER: string;
		VIRTUAL_ENV_DISABLE_PROMPT: string;
		WARP_USE_SSH_WRAPPER: string;
		LSCOLORS: string;
		PATH: string;
		VK_WORKSPACE_BRANCH: string;
		_: string;
		LaunchInstanceID: string;
		npm_package_json: string;
		__CFBundleIdentifier: string;
		npm_config_init_module: string;
		npm_config_userconfig: string;
		PWD: string;
		npm_command: string;
		OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: string;
		EDITOR: string;
		npm_lifecycle_event: string;
		ANDROID_SDK: string;
		LANG: string;
		npm_package_name: string;
		npm_config_progress: string;
		XPC_FLAGS: string;
		npm_config_npm_version: string;
		npm_config_node_gyp: string;
		XPC_SERVICE_NAME: string;
		npm_package_version: string;
		npm_config_yes: string;
		HOME: string;
		SHLVL: string;
		npm_config_fetch_retry_maxtimeout: string;
		HOMEBREW_PREFIX: string;
		LESS: string;
		LOGNAME: string;
		npm_config_cache: string;
		npm_lifecycle_script: string;
		VK_TASK_ID: string;
		COREPACK_ENABLE_AUTO_PIN: string;
		SSH_SOCKET_DIR: string;
		npm_config_fund: string;
		BUN_INSTALL: string;
		npm_config_user_agent: string;
		HOMEBREW_CELLAR: string;
		INFOPATH: string;
		PROMPT_EOL_MARK: string;
		OSLogRateLimit: string;
		CONDA_CHANGEPS1: string;
		CLAUDECODE: string;
		SECURITYSESSIONID: string;
		VK_PROJECT_ID: string;
		COLORTERM: string;
		npm_config_prefix: string;
		npm_node_execpath: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
