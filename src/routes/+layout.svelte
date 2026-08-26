<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { navigating, page } from '$app/state';
	import { onMount } from 'svelte';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import StartupLoader from '$lib/StartupLoader.svelte';
	let { children } = $props();
	let hydrated = $state(false);

	onMount(() => { hydrated = true; });
</script>

<div style="display:none">
	{#each locales as locale (locale)}
		<a
			href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}
		>{locale}</a>
	{/each}
</div>

{#if !hydrated || navigating.to}
	<StartupLoader />
{:else}
	{@render children()}
{/if}
