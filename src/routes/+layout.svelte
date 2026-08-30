<script lang="ts">
	import '../app.css';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import { onMount } from 'svelte';
	import { getTextDirection, locales, localizeHref, setLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import { settings } from '$lib/state/settings.svelte';
	import StartupLoader from '$lib/StartupLoader.svelte';
	import IconHome from '~icons/material-symbols/home-rounded';
	let { children } = $props();
	let hydrated = $state(false);

	const isHome = $derived((page.url.pathname.replace(/\/+$/, '') || '/') === '/');
	const homeLabel = $derived(m.home_button({}, { locale: settings.interfaceLocale }));
	const shellLabel = $derived(m.label({}, { locale: settings.interfaceLocale }));

	$effect(() => {
		document.documentElement.dataset.theme = settings.theme;
		document.documentElement.classList.toggle('dark', settings.theme === 'dark');
	});
	$effect(() => {
		document.documentElement.lang = settings.interfaceLocale;
		document.documentElement.dir = getTextDirection(settings.interfaceLocale);
		void setLocale(settings.interfaceLocale, { reload: false });
	});

	onMount(() => {
		hydrated = true;
		const blockGesture = (event: Event) => event.preventDefault();
		const blockPinch = (event: TouchEvent) => { if (event.touches.length > 1) event.preventDefault(); };
		document.addEventListener('gesturestart', blockGesture, { passive: false });
		document.addEventListener('gesturechange', blockGesture, { passive: false });
		document.addEventListener('gestureend', blockGesture, { passive: false });
		document.addEventListener('touchmove', blockPinch, { passive: false });
		// iOS Safari only renders :active styles on elements with a touch listener in their ancestry;
		// this no-op listener enables the app-wide button press-down animations on touch devices.
		const enableActiveStates = () => {};
		document.addEventListener('touchstart', enableActiveStates, { passive: true });
		const orientation = screen.orientation as ScreenOrientation & { lock?: (type: 'portrait') => Promise<void> };
		void orientation?.lock?.('portrait').catch(() => undefined);
		return () => {
			document.removeEventListener('gesturestart', blockGesture);
			document.removeEventListener('gesturechange', blockGesture);
			document.removeEventListener('gestureend', blockGesture);
			document.removeEventListener('touchmove', blockPinch);
			document.removeEventListener('touchstart', enableActiveStates);
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
		<main class="game-shell">
			<section class="game-paper" aria-label={shellLabel}>
				{#if !isHome}<button class="home-trigger" onclick={() => void goto('/')} aria-label={homeLabel}><IconHome aria-hidden="true" /></button>{/if}
				{@render children()}
			</section>
		</main>
	{/if}
</div>

<style>
	:global(html),:global(body) { width:100%;min-height:100%;overflow:hidden;overscroll-behavior:none;touch-action:pan-y; }
	.portrait-content { width:100%;min-height:100svh; }
	:global(.game-shell) { min-height:100svh;padding:0;display:flex;align-items:stretch;justify-content:center; }
	.game-paper { position:relative;isolation:isolate;box-sizing:border-box;overflow:hidden;width:100%;height:100svh;min-height:0;padding:clamp(.35rem,1.75vw,.7rem);display:flex;flex-direction:column;border:0;background:rgba(255,253,247,.9);box-shadow:none; }
	.game-paper::before { display:none; }
	.home-trigger { position:absolute;z-index:105;top:.62rem;left:.62rem;display:grid;place-items:center;width:2.1rem;height:2.1rem;padding:0;border:1px solid rgba(23,42,69,.36);border-radius:50%;background:rgba(255,253,247,.94);color:#172a45;box-shadow:0 2px 0 rgba(23,42,69,.1); }.home-trigger :global(svg) { width:1rem;height:1rem; }.home-trigger:active { transform:scale(.96); }
	:global(html.dark) .game-paper { background:rgba(23,42,69,.96); }
	:global(html.dark) .home-trigger { border-color:rgba(255,253,247,.42);background:rgba(23,42,69,.94);color:#fffdf7; }
	@media (orientation:landscape) {
		:global(body) { background:#ede4d5; }
		.portrait-content { width:min(100svh,430px);min-height:100svh;margin:0 auto;box-shadow:0 0 0 1px rgba(23,42,69,.15),0 0 42px rgba(23,42,69,.2); }
		:global(.game-shell) { padding:clamp(.25rem,1.2vw,.55rem); }
		.game-paper { width:min(100%,660px);height:calc(100svh - clamp(.5rem,2.4vw,1.1rem));border:1px solid rgba(23,42,69,.17);box-shadow:0 24px 70px rgba(30,33,44,.13),0 2px 0 rgba(23,42,69,.08); }
		.game-paper::before { content:'';display:block;position:absolute;z-index:-1;inset:8px;border:1px solid rgba(23,42,69,.13);pointer-events:none; }
		:global(html.dark) .game-paper { border-color:rgba(255,253,247,.18);box-shadow:0 24px 70px rgba(0,0,0,.35); }
		:global(html.dark) .game-paper::before { border-color:rgba(255,253,247,.14); }
	}
</style>
