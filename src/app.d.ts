/// <reference types="@sveltejs/kit" />
/// <reference types="unplugin-icons/types/svelte" />

// `wawoff2` ships no types; the build scripts only decompress woff2 fonts with it.
declare module 'wawoff2' {
	export function decompress(input: Uint8Array): Promise<Uint8Array>;
}

// Injected by vite.config.ts from package.json.
declare const __APP_VERSION__: string;
