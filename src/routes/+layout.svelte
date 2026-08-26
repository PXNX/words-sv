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

<style>
	:global(html),:global(body) { width:100%;min-height:100%;overflow:hidden;overscroll-behavior:none;touch-action:pan-y; }
	.portrait-content { width:100%;min-height:100svh; }
	@media (orientation:landscape) {
		:global(body) { background:#ede4d5; }
		.portrait-content { width:min(100svh,430px);min-height:100svh;margin:0 auto;box-shadow:0 0 0 1px rgba(23,42,69,.15),0 0 42px rgba(23,42,69,.2); }
	}
</style>
