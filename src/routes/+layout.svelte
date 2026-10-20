<script lang="ts">
	import '../app.css';
	import type { Path } from '$app/types';
	import { resolve } from '$app/paths';
	import { goto, onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { getTextDirection, locales, localizeHref, setLocale } from '#lib/paraglide/runtime.js';
	import { m } from '#lib/paraglide/messages.js';
	import { settings } from '#lib/state/settings.svelte.js';
	import StartupLoader from '#lib/StartupLoader.svelte';
	import { pageTitle } from '#lib/seo.js';
	import IconHome from '~icons/material-symbols/home-rounded';
	let { children } = $props();
	let hydrated = $state(false);

	const routePath = $derived(page.url.pathname.replace(/\/+$/, '') || '/');
	const isHome = $derived(routePath === '/');
	const isListPage = $derived(routePath === '/settings' || routePath === '/stats');
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

	onNavigate((navigation) => {
		if (navigation.shallow && navigation.type === 'goto') return;
		if (!document.startViewTransition) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
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

<svelte:head><title>{pageTitle(page.url.pathname)}</title></svelte:head>

<div style="display:none">
	{#each locales as locale (locale)}
		<a
			href={resolve(localizeHref(page.url.pathname, { locale }) as Path)}
		>{locale}</a>
	{/each}
</div>

<div class="portrait-content">
	{#if !hydrated}
		<StartupLoader />
	{:else}
		<main class="game-shell">
			<section class="game-paper" class:paper-wide={isHome} class:paper-list={isListPage} aria-label={shellLabel}>
				{#if !isHome}<button class="home-trigger" onclick={() => void goto('/')} aria-label={homeLabel}><IconHome aria-hidden="true" /></button>{/if}
				{@render children()}
			</section>
		</main>
	{/if}
</div>

<style>
	:global(html),:global(body) { width:100%;min-height:100%;touch-action:pan-y; }
	:global(::view-transition-old(root)),:global(::view-transition-new(root)) { animation-duration:.14s;animation-timing-function:ease-out; }
	.portrait-content { width:100%;min-height:100svh; }
	:global(.game-shell) { min-height:100svh;padding:0;display:flex;align-items:stretch;justify-content:center; }
	.game-paper { position:relative;isolation:isolate;box-sizing:border-box;overflow:hidden;width:100%;height:100svh;min-height:0;padding:0;display:flex;flex-direction:column;justify-content:center;border:0;background-color:#ede4d5;background-image:radial-gradient(circle at 50% 15%,rgba(230,165,39,.18),transparent 34%),linear-gradient(rgba(23,42,69,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(23,42,69,.018) 1px,transparent 1px);background-size:auto,24px 24px,24px 24px;box-shadow:none; }
	.game-paper::before { display:none; }
	.home-trigger { position:absolute;z-index:105;top:.62rem;left:.62rem;display:grid;place-items:center;width:2.1rem;height:2.1rem;padding:0;border:1px solid rgba(23,42,69,.36);border-radius:50%;background:rgba(255,253,247,.94);color:#172a45;box-shadow:0 2px 0 rgba(23,42,69,.1); }.home-trigger :global(svg) { width:1rem;height:1rem; }.home-trigger:active { transform:scale(.96); }
	:global(html.dark) .game-paper { background-color:#213a5d; }
	:global(html.dark) .home-trigger { border-color:rgba(255,253,247,.42);background:rgba(23,42,69,.94);color:#fffdf7; }
	/* Phones (and phones held sideways, which are too short for a frame) stay full-bleed. Anything with room
	   around it gets a framed paper sheet: wider for the home menu, medium for lists, game-sized otherwise. */
	@media (min-width:700px) and (min-height:560px) {
		:global(html.dark body) { background-color:#172a45;background-image:none; }
		:global(.game-shell) { padding:clamp(.75rem,2.2vw,1.75rem); }
		.game-paper { --paper-width:640px;width:min(100%,var(--paper-width));height:calc(100svh - 2 * clamp(.75rem,2.2vw,1.75rem));border:1px solid rgba(23,42,69,.17);border-radius:1.5rem;box-shadow:0 24px 70px rgba(30,33,44,.13),0 2px 0 rgba(23,42,69,.08); }
		.game-paper.paper-list { --paper-width:760px; }
		.game-paper.paper-wide { --paper-width:1000px; }
		.game-paper::before { content:'';display:block;position:absolute;z-index:-1;inset:8px;border:1px solid rgba(23,42,69,.13);border-radius:1.1rem;pointer-events:none; }
		:global(html.dark) .game-paper { border-color:rgba(255,253,247,.18);box-shadow:0 24px 70px rgba(0,0,0,.35); }
		:global(html.dark) .game-paper::before { border-color:rgba(255,253,247,.14); }
	}
	@media (hover:hover) {
		.home-trigger { cursor:pointer;transition:transform .16s cubic-bezier(.23,1,.32,1),box-shadow .16s; }
		.home-trigger:hover { transform:translateY(-1px);box-shadow:0 4px 10px rgba(23,42,69,.16); }
	}
</style>
