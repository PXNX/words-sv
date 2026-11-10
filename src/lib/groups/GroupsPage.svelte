<!--
  Group leagues: the learner's groups, each with this week's ranking (everyone drawn as their own
  story character), plus creating a group, joining one by code or invite link (/groups?join=CODE),
  inviting friends and leaving. Points are scored on the server from the streak (api/groups).
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { flip } from 'svelte/animate';
  import { fly, slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion } from 'svelte/motion';
  import { page } from '$app/state';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { num } from '#lib/format/num.svelte.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { defaultAvatar, parseAvatar } from '#lib/profile/avatar.js';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import type { GroupView } from '#lib/api/schemas.js';
  import { openTelegramLink } from '#lib/settings/telegramClient.js';
  import { groupsCall, GroupsUnavailable, joinLink, normalizeCode, type GroupAction, type GroupError } from './groupsClient.js';
  import IconAdd from '~icons/material-symbols/group-add-rounded';
  import IconLogin from '~icons/material-symbols/login-rounded';
  import IconShare from '~icons/material-symbols/share';
  import IconTrophy from '~icons/material-symbols/trophy-rounded';
  import IconInfo from '~icons/material-symbols/info-outline-rounded';

  const locale = $derived({ locale: settings.interfaceLocale });
  const direction = $derived(getTextDirection(settings.interfaceLocale));
  const ms = (duration: number) => (prefersReducedMotion.current ? 0 : duration);

  let groups = $state<GroupView[] | null>(null);
  let error = $state<GroupError | null>(null);
  let busy = $state(false);
  let notice = $state('');
  let newName = $state('');
  let code = $state('');
  let offered = $state<string | null>(null);
  let showHow = $state(false);

  const me = $derived({ name: settings.firstName.trim(), avatar: settings.avatar ? JSON.stringify(settings.avatar) : null });
  const canPlay = $derived(me.name.length > 0);
  const errorText = (code: GroupError) => ({
    unknown_group: m.groups_error_unknown_group,
    group_full: m.groups_error_group_full,
    too_many_groups: m.groups_error_too_many_groups,
    invalid_request: m.groups_error_invalid_request,
    unavailable: m.groups_error_unavailable
  })[code]({}, locale);

  async function run(request: GroupAction) {
    busy = true;
    error = null;
    try {
      groups = await groupsCall(request, me);
      return true;
    } catch (failure) {
      error = failure instanceof GroupsUnavailable ? failure.code : 'unavailable';
      haptic('error');
      return false;
    } finally {
      busy = false;
    }
  }

  onMount(() => {
    const invited = normalizeCode(page.url.searchParams.get('join') ?? '');
    if (invited) {
      offered = invited;
      code = invited;
    }
    void run({ action: 'list' }).then(() => {
      // Already a member of the invited group: nothing to offer.
      if (offered && groups?.some((group) => group.code === offered)) offered = null;
    });
  });

  // A changed name or character shows up in every group the next time the page opens.
  let synced = '';
  $effect(() => {
    const key = `${me.name}|${me.avatar}`;
    if (!groups?.length || !canPlay || synced === key) return;
    const stale = groups.some((group) => group.members.some((member) => member.you && (member.name !== me.name || member.avatar !== me.avatar)));
    synced = key;
    if (stale) void run({ action: 'profile' });
  });

  async function create(event: SubmitEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name || !canPlay) return;
    if (await run({ action: 'create', name })) {
      newName = '';
      haptic('success');
    }
  }
  async function join(event?: SubmitEvent) {
    event?.preventDefault();
    const normalized = normalizeCode(code);
    if (!normalized) {
      error = 'invalid_request';
      return;
    }
    if (await run({ action: 'join', code: normalized })) {
      code = '';
      offered = null;
      haptic('success');
    }
  }
  async function leave(group: GroupView) {
    if (!confirm(m.groups_leave_confirm({ name: group.name }, locale))) return;
    await run({ action: 'leave', code: group.code });
  }
  async function invite(group: GroupView) {
    haptic('tap');
    const url = joinLink(group.code);
    const text = m.groups_invite_text({ name: group.name, code: group.code }, locale);
    // In the Mini App, Telegram's own share sheet; elsewhere the system one, then the clipboard.
    if (typeof window !== 'undefined' && (window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData) {
      openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: group.name, text, url });
        return;
      } catch (failure) {
        if (failure instanceof DOMException && failure.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      notice = m.groups_copied({}, locale);
      setTimeout(() => (notice = ''), 2500);
    } catch {}
  }
  function avatarOf(raw: string | null) {
    return parseAvatar(raw) ?? defaultAvatar;
  }
</script>

<main class="groups" dir={direction} lang={settings.interfaceLocale}>
  <header class="groups-header">
    <p class="groups-kicker">{m.groups_kicker({}, locale)}</p>
    <h1>{m.groups_title({}, locale)}</h1>
    <p class="groups-intro">{m.groups_intro({}, locale)}</p>
    <button type="button" class="groups-how-toggle" aria-expanded={showHow} onclick={() => (showHow = !showHow)}><IconInfo aria-hidden="true" />{m.groups_how({}, locale)}</button>
    {#if showHow}<p class="groups-how" transition:slide={{ duration: ms(200) }}>{m.groups_how_text({}, locale)}</p>{/if}
  </header>

  {#if !canPlay}
    <p class="groups-banner" role="status"><a href="/progress">{m.groups_need_name({}, locale)}</a></p>
  {/if}
  {#if error}<p class="groups-banner error" role="alert" transition:fly={{ y: -8, duration: ms(180) }}>{errorText(error)}</p>{/if}
  {#if notice}<p class="groups-banner" role="status" transition:fly={{ y: -8, duration: ms(180) }}>{notice}</p>{/if}

  {#if offered && canPlay}
    <section class="panel-play groups-offer" transition:fly={{ y: 12, duration: ms(260), easing: cubicOut }}>
      <p>{m.groups_join_offer({}, locale)} <b dir="ltr">{offered}</b></p>
      <button type="button" class="btn-play btn-play-ink" disabled={busy} onclick={() => join()}><IconLogin aria-hidden="true" />{m.groups_join_go({}, locale)}</button>
    </section>
  {/if}

  {#if groups === null && !error}
    <div class="groups-loading" aria-busy="true"><span></span><span></span></div>
  {:else if groups?.length === 0}
    <p class="groups-empty">{m.groups_empty({}, locale)}</p>
  {/if}

  {#each groups ?? [] as group, groupIndex (group.code)}
    <section class="panel-play group" aria-labelledby={`group-${group.code}`} in:fly={{ y: 16, duration: ms(320), delay: ms(groupIndex * 60), easing: cubicOut }}>
      <header class="group-head">
        <div>
          <h2 id={`group-${group.code}`}>{group.name}</h2>
          <small dir="ltr">{group.code}</small>
        </div>
        <button type="button" class="btn-play btn-play-sm btn-play-soft" onclick={() => invite(group)}><IconShare aria-hidden="true" />{m.groups_invite({}, locale)}</button>
      </header>
      <ol class="group-ranking">
        {#each group.members as member, index (member.name + index)}
          <li class:you={member.you} class:podium={member.rank <= 3 && member.points > 0} animate:flip={{ duration: ms(300) }}>
            <span class="rank" aria-hidden="true">{#if member.rank === 1 && member.points > 0}<IconTrophy />{:else}{num(member.rank)}{/if}</span>
            <span class="face" aria-hidden="true"><StoryCharacter id="kumar" avatar={avatarOf(member.avatar)} mood={member.rank === 1 && member.points > 0 ? 'happy' : 'neutral'} still /></span>
            <span class="who">{member.name}{#if member.you}<em>{m.groups_you({}, locale)}</em>{/if}</span>
            <span class="points">{m.groups_points({ count: num(member.points) }, locale)}</span>
            <span class="bar" style:--share={`${group.members[0]!.points ? member.points / group.members[0]!.points : 0}`} aria-hidden="true"></span>
          </li>
        {/each}
      </ol>
      <button type="button" class="group-leave" disabled={busy} onclick={() => leave(group)}>{m.groups_leave({}, locale)}</button>
    </section>
  {/each}

  {#if canPlay}
    <div class="groups-forms">
      <form class="panel-play groups-form" onsubmit={create}>
        <h2><IconAdd aria-hidden="true" />{m.groups_create({}, locale)}</h2>
        <label><span>{m.groups_create_name({}, locale)}</span><input bind:value={newName} maxlength="40" autocomplete="off" required /></label>
        <button type="submit" class="btn-play btn-play-ink" disabled={busy || !newName.trim()}>{m.groups_create_go({}, locale)}</button>
      </form>
      <form class="panel-play groups-form" onsubmit={join}>
        <h2><IconLogin aria-hidden="true" />{m.groups_join({}, locale)}</h2>
        <label><span>{m.groups_join_code({}, locale)}</span><input bind:value={code} maxlength="8" autocomplete="off" autocapitalize="characters" spellcheck="false" dir="ltr" required /></label>
        <button type="submit" class="btn-play" disabled={busy || !code.trim()}>{m.groups_join_go({}, locale)}</button>
      </form>
    </div>
  {/if}
</main>

<style>
  .groups { flex:1;min-height:0;overflow-y:auto;width:100%;max-width:40rem;margin-inline:auto;padding:clamp(3.2rem,10vw,3.8rem) clamp(1rem,5vw,2rem) 2rem;display:grid;align-content:start;gap:.9rem;font-family:'DM Sans',sans-serif; }
  .groups-header { display:grid;gap:.3rem; }
  .groups-kicker { margin:0;color:#a45e38;font-size:.58rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .groups-header h1 { margin:0;font-family:'DM Serif Display',serif;font-size:1.9rem;font-weight:400;line-height:1.05; }
  .groups-intro,.groups-how { margin:0;color:color-mix(in srgb,currentColor 68%,transparent);font-size:.7rem;font-weight:700;line-height:1.45; }
  .groups-how-toggle { justify-self:start;display:inline-flex;align-items:center;gap:.3rem;padding:0;border:0;background:none;color:#2a6fa8;font:inherit;font-size:.64rem;font-weight:800;cursor:pointer; }
  .groups-how-toggle :global(svg) { width:.9rem;height:.9rem; }
  .groups-banner { margin:0;padding:.55rem .75rem;border-radius:.8rem;background:#dcebf7;color:#1d4f7a;font-size:.66rem;font-weight:800; }
  .groups-banner a { color:inherit; }
  .groups-banner.error { background:#f7dcd9;color:#8a2b22; }
  .groups-offer { display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.6rem;padding:.8rem; }
  .groups-offer p { margin:0;font-size:.72rem;font-weight:800; }
  .groups-empty { margin:0;text-align:center;font-size:.72rem;font-weight:800;opacity:.6; }
  .groups-loading { display:grid;gap:.6rem; }
  .groups-loading span { height:7rem;border-radius:1.1rem;background:linear-gradient(90deg,rgba(23,42,69,.06),rgba(23,42,69,.12),rgba(23,42,69,.06));background-size:200% 100%;animation:groups-shimmer 1.2s linear infinite; }
  .group { display:grid;gap:.6rem;padding:.85rem .85rem .7rem; }
  .group-head { display:flex;align-items:center;justify-content:space-between;gap:.6rem; }
  .group-head h2 { margin:0;font-size:.95rem;font-weight:900; }
  .group-head small { font-size:.58rem;font-weight:800;letter-spacing:.14em;opacity:.55; }
  .group-head :global(svg) { width:.85rem;height:.85rem; }
  .group-ranking { margin:0;padding:0;list-style:none;display:grid;gap:.3rem; }
  .group-ranking li { position:relative;display:grid;grid-template-columns:1.6rem 2.2rem 1fr auto;align-items:center;gap:.5rem;padding:.3rem .55rem;border-radius:.8rem;overflow:hidden;isolation:isolate; }
  .group-ranking li.you { background:rgba(230,165,39,.16); }
  .rank { display:grid;place-items:center;font-size:.72rem;font-weight:900;color:color-mix(in srgb,currentColor 60%,transparent); }
  .podium .rank { color:#c9832f; }
  .rank :global(svg) { width:1.15rem;height:1.15rem;animation:groups-pop .5s cubic-bezier(.34,1.56,.64,1) both; }
  .face { display:block;width:2.2rem;height:2.6rem; }
  .who { min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.74rem;font-weight:800; }
  .who em { margin-inline-start:.35rem;padding:.05rem .35rem;border-radius:999px;background:#172a45;color:#fffdf7;font-size:.52rem;font-style:normal;font-weight:900;letter-spacing:.06em;text-transform:uppercase; }
  .points { font-size:.66rem;font-weight:900;font-variant-numeric:tabular-nums; }
  .bar { position:absolute;inset:auto 0 0 0;z-index:-1;height:.18rem;background:#e6a527;transform-origin:0 50%;transform:scaleX(var(--share));opacity:.55;transition:transform .6s cubic-bezier(.2,.8,.2,1); }
  :global([dir='rtl']) .bar { transform-origin:100% 50%; }
  .group-leave { justify-self:end;padding:0;border:0;background:none;color:inherit;font:inherit;font-size:.6rem;font-weight:800;text-decoration:underline;text-underline-offset:2px;opacity:.55;cursor:pointer; }
  .groups-forms { display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.8rem; }
  .groups-form { display:grid;gap:.55rem;padding:.85rem; }
  .groups-form h2 { margin:0;display:flex;align-items:center;gap:.35rem;color:#a45e38;font-size:.6rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase; }
  .groups-form h2 :global(svg) { width:1rem;height:1rem; }
  .groups-form label { display:grid;gap:.25rem;font-size:.6rem;font-weight:800;opacity:.85; }
  .groups-form input { width:100%;padding:.5rem .65rem;border:2px solid rgba(23,42,69,.2);border-radius:.7rem;background:rgba(255,253,247,.9);color:#172a45;font:inherit;font-size:.8rem;font-weight:800;transition:border-color .2s; }
  .groups-form input:focus { outline:none;border-color:#e6a527; }
  :global(html.dark) .groups-form input { border-color:rgba(255,253,247,.25);background:#152b47;color:#fffdf7; }
  :global(html.dark) .groups-banner { background:#213a5d;color:#cfe4f5; }
  :global(html.dark) .groups-banner.error { background:#4a2622;color:#f4c9c3; }
  :global(html.dark) .groups-kicker,:global(html.dark) .groups-form h2 { color:#e6a527; }
  :global(html.dark) .who em { background:#e6a527;color:#172a45; }
  @keyframes groups-shimmer { to { background-position:-200% 0; } }
  @keyframes groups-pop { from { transform:scale(.3) rotate(-20deg);opacity:0; } }
  @media (prefers-reduced-motion:reduce) { .groups-loading span,.rank :global(svg) { animation:none; } .bar { transition:none; } }
</style>
