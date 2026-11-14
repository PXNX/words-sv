<!--
  A thin bar along the top edge while a tap's page is still on its way. Most navigations here finish
  fast enough that the bar never shows (it waits a blink first); on a slow connection it is the only
  sign that the tap registered, which is what keeps the app feeling responsive.
-->
<script lang="ts">
  import { navigating, page } from '$app/state';

  // The target stops counting as pending the moment it is on screen, even while a view transition
  // is still playing: the bar belongs to the wait, not to the animation.
  const pending = $derived(
    navigating.to !== null && navigating.to.url.pathname + navigating.to.url.search !== page.url.pathname + page.url.search
  );
</script>

{#if pending}
  <div class="nav-progress" aria-hidden="true"><span></span></div>
{/if}

<style>
  .nav-progress {
    position:absolute;
    z-index:130;
    inset-block-start:0;
    inset-inline:0;
    height:3px;
    overflow:hidden;
    pointer-events:none;
    animation:nav-progress-show .14s ease-out .16s both;
  }
  .nav-progress span {
    display:block;
    width:34%;
    height:100%;
    border-radius:999px;
    background:var(--sun);
    box-shadow:0 0 10px color-mix(in oklch,var(--sun) 70%,transparent);
    animation:nav-progress-run 1.15s cubic-bezier(.45,.05,.55,.95) infinite;
  }
  @keyframes nav-progress-show { from { opacity:0; } to { opacity:1; } }
  @keyframes nav-progress-run { 0% { transform:translateX(-110%); } 100% { transform:translateX(330%); } }
  @media (prefers-reduced-motion:reduce) {
    .nav-progress { animation: none; }
    .nav-progress span { width:100%; animation: none; opacity:.75; }
  }
</style>
