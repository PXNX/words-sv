<script lang="ts">
	import '../app.css';
	import type { Path } from '$app/types';
	import { resolve } from '$app/paths';
	import { goto, onNavigate } from '$app/navigation';
	import { page, updated } from '$app/state';
import { onMount } from 'svelte';
import { getTextDirection, locales, localizeHref, setLocale } from '#lib/paraglide/runtime.js';
import { m } from '#lib/paraglide/messages.js';
import { settings } from '#lib/state/settings.svelte.js';
import { warmLanguage, refreshHintableBaseWords } from '#lib/data/vocabulary.js';
import StartupLoader from '#lib/StartupLoader.svelte';
	import { pwaInstall } from '#lib/pwaInstall.svelte.js';
	import { autoUpdateOnStart } from '#lib/pwaUpdate.js';
	import { prepareNatural } from '#lib/story/naturalVoices.svelte.js';
	import { pageTitle } from '#lib/seo.js';
	import IconHome from '~icons/material-symbols/home-rounded';
	let { children } = $props();
	let hydrated = $state(false);
	let previousLanguage = settings.lang;

	const routePath = $derived(page.url.pathname.replace(/\/+$/, '') || '/');
	const isHome = $derived(routePath === '/');
	const isListPage = $derived(routePath === '/settings' || routePath === '/progress' || routePath === '/repeat');
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
	// Switching the learning language while natural voices are on fetches that language's model,
	// unless it is already loaded or cached.
	$effect(() => {
		const language = settings.lang;
		if (language === previousLanguage) return;
		previousLanguage = language;
		if (settings.voiceQuality === 'natural') void prepareNatural(language);
	});

	onNavigate((navigation) => {
		if (navigation.shallow && navigation.type === 'goto') return;
		if (!document.startViewTransition) return;
		// Going deeper (home → mode → tutorial) slides forward, going up or back in history slides back.
		const depth = (path = '/') => path.split('/').filter(Boolean).length;
		const back = navigation.delta !== undefined ? navigation.delta < 0 : depth(navigation.to?.url.pathname) < depth(navigation.from?.url.pathname);
		document.documentElement.dataset.navDirection = back ? 'back' : 'forward';
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

onMount(() => {
    void autoUpdateOnStart();
    void updated.check();
    pwaInstall.init();
    hydrated = true;
    // Fetch the learner's vocabulary in the background so game modes that need it don't
    // block on the first render. Other languages stay out of the bundle entirely.
    void warmLanguage(settings.lang).then(refreshHintableBaseWords);
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
				{#if !isHome}<button class="btn-play btn-play-round home-trigger" onclick={() => void goto('/')} aria-label={homeLabel}><IconHome aria-hidden="true" /></button>{/if}
				{@render children()}
			</section>
		</main>
	{/if}
</div>

<style>
	:global(html),:global(body) { width:100%;min-height:100%;touch-action:pan-y; }
	:global(::view-transition-old(root)) { animation:.22s cubic-bezier(.4,0,1,1) both vt-out; }
	:global(::view-transition-new(root)) { animation:.32s cubic-bezier(.2,.9,.3,1.15) both vt-in; }
	:global(html[data-nav-direction='back']::view-transition-old(root)) { animation-name:vt-out-back; }
	:global(html[data-nav-direction='back']::view-transition-new(root)) { animation-name:vt-in-back; }
	@keyframes -global-vt-out { to { opacity:0;transform:translateX(-12%) scale(.96); } }
	@keyframes -global-vt-in { from { opacity:0;transform:translateX(18%) rotate(1.2deg); } }
	@keyframes -global-vt-out-back { to { opacity:0;transform:translateX(12%) scale(.96); } }
	@keyframes -global-vt-in-back { from { opacity:0;transform:translateX(-18%) rotate(-1.2deg); } }
	@media (prefers-reduced-motion:reduce) { :global(html[data-nav-direction]::view-transition-old(root)) { animation:.12s ease-out both vt-fade-out; } :global(html[data-nav-direction]::view-transition-new(root)) { animation:.12s ease-out both vt-fade-in; } }
	@keyframes -global-vt-fade-out { to { opacity:0; } }
	@keyframes -global-vt-fade-in { from { opacity:0; } }
	.portrait-content { width:100%;min-height:100svh; }
	:global(.game-shell) { min-height:100svh;padding:0;display:flex;align-items:stretch;justify-content:center; }
	.game-paper { position:relative;isolation:isolate;box-sizing:border-box;overflow:hidden;width:100%;height:100svh;min-height:0;padding:0;display:flex;flex-direction:column;justify-content:center;border:0;background-color:#ede4d5;background-image:radial-gradient(circle at 50% 15%,rgba(230,165,39,.18),transparent 34%),linear-gradient(rgba(23,42,69,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(23,42,69,.018) 1px,transparent 1px);background-size:auto,24px 24px,24px 24px;box-shadow:none; }
	.game-paper::before { display:none; }
	.home-trigger { position:absolute;z-index:105;top:.62rem;left:.62rem; }.home-trigger :global(svg) { width:1rem;height:1rem; }
	:global(html.dark) .game-paper { background-color:#213a5d; }
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
</style>
