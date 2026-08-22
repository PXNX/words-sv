
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';
 * 
 * console.log(ENVIRONMENT); // => "production"
 * console.log(PUBLIC_BASE_URL); // => throws error during build
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/private' {
	export const NODE_ENV: string;
	export const PNPM_HOME: string;
	export const TZ: string;
	export const PNPM_SCRIPT_SRC_DIR: string;
	export const UV_BREAK_SYSTEM_PACKAGES: string;
	export const MANUS_ADDON_RUNTIME_SPEC_PATH: string;
	export const APP_ENV: string;
	export const PWD: string;
	export const VITE_FRONTEND_FORGE_API_URL: string;
	export const OTEL_TRACES_EXPORTER: string;
	export const MALLOC_ARENA_MAX: string;
	export const SUPERVISOR_PROCESS_NAME: string;
	export const NEKO_USER_PASSWORD: string;
	export const PW_TEST_SCREENSHOT_NO_FONTS_READY: string;
	export const BASH_ENV: string;
	export const CHROME_INSTANCE_PATH: string;
	export const SENTRY_DSN: string;
	export const SUPERVISOR_SERVER_URL: string;
	export const OTEL_BSP_MAX_EXPORT_BATCH_SIZE: string;
	export const npm_execpath: string;
	export const SUDO_USER: string;
	export const GIT_PAGER: string;
	export const NEKO_USERNAME: string;
	export const PROMPT_COMMAND: string;
	export const NODE_PATH: string;
	export const npm_lifecycle_event: string;
	export const NEKO_ADMIN_PASSWORD: string;
	export const JWT_SECRET: string;
	export const npm_package_version: string;
	export const GIT_TERMINAL_PROMPT: string;
	export const CLICOLOR_FORCE: string;
	export const npm_lifecycle_script: string;
	export const VITE_FRONTEND_FORGE_API_KEY: string;
	export const OTEL_LOG_SAMPLE_RATE: string;
	export const LS_COLORS: string;
	export const VITE_OAUTH_PORTAL_URL: string;
	export const OWNER_OPEN_ID: string;
	export const PS2: string;
	export const GIT_CONFIG_KEY_0: string;
	export const BUILT_IN_FORGE_API_KEY: string;
	export const OTEL_TRACE_CUSTOM_SAMPLER_EXCLUDED_URLS: string;
	export const INIT_CWD: string;
	export const PIP_BREAK_SYSTEM_PACKAGES: string;
	export const OTEL_PYTHON_LOG_CORRELATION: string;
	export const SUPERVISOR_ENABLED: string;
	export const pnpm_config_verify_deps_before_run: string;
	export const OPENAI_API_KEY: string;
	export const PAGER: string;
	export const PORT: string;
	export const MANUS_ADDON_REGISTRY_ENABLED: string;
	export const MANUS_WEBDEV_PROJECT_ID: string;
	export const OTEL_BSP_SCHEDULE_DELAY: string;
	export const VITE_APP_LOGO: string;
	export const HOME: string;
	export const VITE_APP_ID: string;
	export const SVELTEKIT_FORK: string;
	export const GIT_CONFIG_COUNT: string;
	export const npm_node_execpath: string;
	export const BUILT_IN_FORGE_API_URL: string;
	export const USER: string;
	export const OLDPWD: string;
	export const npm_package_json: string;
	export const PS1: string;
	export const DBUS_SESSION_BUS_ADDRESS: string;
	export const RUNTIME_API_HOST: string;
	export const SUDO_COMMAND: string;
	export const SUDO_UID: string;
	export const npm_config_user_agent: string;
	export const OWNER_NAME: string;
	export const SUPERVISOR_GROUP_NAME: string;
	export const RUNTIME_CRASH_STATE_DIR: string;
	export const SHLVL: string;
	export const GH_TOKEN: string;
	export const MAIL: string;
	export const OTEL_SERVICE_NAME: string;
	export const LESS: string;
	export const VITE_ANALYTICS_WEBSITE_ID: string;
	export const AGENT_LOCALE: string;
	export const LAST_COMMIT_HASH: string;
	export const DATABASE_URL: string;
	export const _: string;
	export const GOOGLE_WORKSPACE_CLI_TOKEN: string;
	export const OPENAI_BASE_URL: string;
	export const npm_package_name: string;
	export const OTEL_EXPORTER_OTLP_ENDPOINT: string;
	export const GIT_CONFIG_VALUE_0: string;
	export const SUDO_GID: string;
	export const MANUS_ADDON_RUNTIME_SPECS_REVISION: string;
	export const WEBDEV_TEMPLATES_PATH: string;
	export const npm_command: string;
	export const LOGNAME: string;
	export const AGENT_TIMEZONE: string;
	export const NODE_OPTIONS: string;
	export const OAUTH_SERVER_URL: string;
	export const TERM: string;
	export const BASH_SILENCE_DEPRECATION_WARNING: string;
	export const OTEL_RESOURCE_ATTRIBUTES: string;
	export const LANG: string;
	export const HISTCONTROL: string;
	export const GOOGLE_DRIVE_TOKEN: string;
	export const OPENAI_API_BASE: string;
	export const SHELL: string;
	export const npm_config_node_gyp: string;
	export const VITE_APP_TITLE: string;
	export const OTEL_TRACES_SAMPLER_RATIO: string;
	export const PATH: string;
	export const NODE: string;
	export const OTEL_SPAN_MIN_DURATION_MS: string;
	export const VITE_ANALYTICS_ENDPOINT: string;
	export const DISPLAY: string;
	export const CLICOLOR: string;
	export const DEPLOY_WASMER_OWNER: string;
}

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';
 * 
 * console.log(ENVIRONMENT); // => throws error during build
 * console.log(PUBLIC_BASE_URL); // => "http://site.com"
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * 
 * console.log(env.ENVIRONMENT); // => "production"
 * console.log(env.PUBLIC_BASE_URL); // => undefined
 * ```
 */
declare module '$env/dynamic/private' {
	export const env: {
		NODE_ENV: string;
		PNPM_HOME: string;
		TZ: string;
		PNPM_SCRIPT_SRC_DIR: string;
		UV_BREAK_SYSTEM_PACKAGES: string;
		MANUS_ADDON_RUNTIME_SPEC_PATH: string;
		APP_ENV: string;
		PWD: string;
		VITE_FRONTEND_FORGE_API_URL: string;
		OTEL_TRACES_EXPORTER: string;
		MALLOC_ARENA_MAX: string;
		SUPERVISOR_PROCESS_NAME: string;
		NEKO_USER_PASSWORD: string;
		PW_TEST_SCREENSHOT_NO_FONTS_READY: string;
		BASH_ENV: string;
		CHROME_INSTANCE_PATH: string;
		SENTRY_DSN: string;
		SUPERVISOR_SERVER_URL: string;
		OTEL_BSP_MAX_EXPORT_BATCH_SIZE: string;
		npm_execpath: string;
		SUDO_USER: string;
		GIT_PAGER: string;
		NEKO_USERNAME: string;
		PROMPT_COMMAND: string;
		NODE_PATH: string;
		npm_lifecycle_event: string;
		NEKO_ADMIN_PASSWORD: string;
		JWT_SECRET: string;
		npm_package_version: string;
		GIT_TERMINAL_PROMPT: string;
		CLICOLOR_FORCE: string;
		npm_lifecycle_script: string;
		VITE_FRONTEND_FORGE_API_KEY: string;
		OTEL_LOG_SAMPLE_RATE: string;
		LS_COLORS: string;
		VITE_OAUTH_PORTAL_URL: string;
		OWNER_OPEN_ID: string;
		PS2: string;
		GIT_CONFIG_KEY_0: string;
		BUILT_IN_FORGE_API_KEY: string;
		OTEL_TRACE_CUSTOM_SAMPLER_EXCLUDED_URLS: string;
		INIT_CWD: string;
		PIP_BREAK_SYSTEM_PACKAGES: string;
		OTEL_PYTHON_LOG_CORRELATION: string;
		SUPERVISOR_ENABLED: string;
		pnpm_config_verify_deps_before_run: string;
		OPENAI_API_KEY: string;
		PAGER: string;
		PORT: string;
		MANUS_ADDON_REGISTRY_ENABLED: string;
		MANUS_WEBDEV_PROJECT_ID: string;
		OTEL_BSP_SCHEDULE_DELAY: string;
		VITE_APP_LOGO: string;
		HOME: string;
		VITE_APP_ID: string;
		SVELTEKIT_FORK: string;
		GIT_CONFIG_COUNT: string;
		npm_node_execpath: string;
		BUILT_IN_FORGE_API_URL: string;
		USER: string;
		OLDPWD: string;
		npm_package_json: string;
		PS1: string;
		DBUS_SESSION_BUS_ADDRESS: string;
		RUNTIME_API_HOST: string;
		SUDO_COMMAND: string;
		SUDO_UID: string;
		npm_config_user_agent: string;
		OWNER_NAME: string;
		SUPERVISOR_GROUP_NAME: string;
		RUNTIME_CRASH_STATE_DIR: string;
		SHLVL: string;
		GH_TOKEN: string;
		MAIL: string;
		OTEL_SERVICE_NAME: string;
		LESS: string;
		VITE_ANALYTICS_WEBSITE_ID: string;
		AGENT_LOCALE: string;
		LAST_COMMIT_HASH: string;
		DATABASE_URL: string;
		_: string;
		GOOGLE_WORKSPACE_CLI_TOKEN: string;
		OPENAI_BASE_URL: string;
		npm_package_name: string;
		OTEL_EXPORTER_OTLP_ENDPOINT: string;
		GIT_CONFIG_VALUE_0: string;
		SUDO_GID: string;
		MANUS_ADDON_RUNTIME_SPECS_REVISION: string;
		WEBDEV_TEMPLATES_PATH: string;
		npm_command: string;
		LOGNAME: string;
		AGENT_TIMEZONE: string;
		NODE_OPTIONS: string;
		OAUTH_SERVER_URL: string;
		TERM: string;
		BASH_SILENCE_DEPRECATION_WARNING: string;
		OTEL_RESOURCE_ATTRIBUTES: string;
		LANG: string;
		HISTCONTROL: string;
		GOOGLE_DRIVE_TOKEN: string;
		OPENAI_API_BASE: string;
		SHELL: string;
		npm_config_node_gyp: string;
		VITE_APP_TITLE: string;
		OTEL_TRACES_SAMPLER_RATIO: string;
		PATH: string;
		NODE: string;
		OTEL_SPAN_MIN_DURATION_MS: string;
		VITE_ANALYTICS_ENDPOINT: string;
		DISPLAY: string;
		CLICOLOR: string;
		DEPLOY_WASMER_OWNER: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://example.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.ENVIRONMENT); // => undefined, not public
 * console.log(env.PUBLIC_BASE_URL); // => "http://example.com"
 * ```
 * 
 * ```
 * 
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
