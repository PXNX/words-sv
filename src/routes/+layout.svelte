<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { navigating, page } from '$app/state';
	import { onMount } from 'svelte';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import StartupLoader from '$lib/StartupLoader.svelte';
	let { children } = $props();
	let hydrated = $state(false);

	onMount(() => {
		hydrated = true;
		const blockGesture = (event: Event) => event.preventDefault();
		const blockPinch = (event: TouchEvent) => { if (event.touches.length > 1) event.preventDefault(); };
		document.addEventListener('gesturestart', blockGesture, { passive: false });
		document.addEventListener('gesturechange', blockGesture, { passive: false });
		document.addEventListener('gestureend', blockGesture, { passive: false });
		document.addEventListener('touchmove', blockPinch, { passive: false });
		const orientation = screen.orientation as ScreenOrientation & { lock?: (type: 'portrait') => Promise<void> };
		void orientation?.lock?.('portrait').catch(() => undefined);
		return () => {
			document.removeEventListener('gesturestart', blockGesture);
			document.removeEventListener('gesturechange', blockGesture);
			document.removeEventListener('gestureend', blockGesture);
			document.removeEventListener('touchmove', blockPinch);
		};
	});
</script>

<div style="display:none">
	{#each locales as locale (locale)}
		<a
			href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}
		>{locale}</a>
	{/each}
</div>

<div class="portrait-content">
	{#if !hydrated || navigating.to}
		<StartupLoader />
	{:else}
		{@render children()}
	{/if}
</div>

<aside class="portrait-guard" role="alert" aria-label="Portrait orientation required">
	<span aria-hidden="true">↻</span>
	<strong>Turn your device upright.</strong>
	<p>WordCircle is designed for portrait play.</p>
</aside>

<style>
	:global(html),:global(body) { width:100%;min-height:100%;overflow:hidden;overscroll-behavior:none;touch-action:pan-y; }
	.portrait-guard { display:none; }
	@media (orientation:landscape) {
		.portrait-content { display:none; }
		.portrait-guard { position:fixed;inset:0;z-index:300;display:grid;place-content:center;justify-items:center;gap:.55rem;padding:2rem;background:#172a45;color:#fffdf7;text-align:center; }
		.portrait-guard span { display:grid;place-items:center;width:3.5rem;height:3.5rem;border:2px solid #e6a527;border-radius:50%;color:#e6a527;font-size:2rem; }.portrait-guard strong { font-family:'DM Serif Display',serif;font-size:clamp(1.5rem,4vw,2.3rem);font-weight:400; }.portrait-guard p { margin:0;color:rgba(255,253,247,.72);font-family:'DM Sans',sans-serif;font-size:.75rem;font-weight:700; }
	}
</style>
