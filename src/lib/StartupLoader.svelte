<div class="startup-loader" role="status" aria-label="Loading WordCircle">
  <span class="startup-mark" aria-hidden="true"><i></i><b></b></span>
  <span class="sr-only">Loading WordCircle</span>
</div>

<style>
  .startup-loader { position:fixed;z-index:200;inset:0;display:grid;place-items:center;background:rgba(255,253,247,.98); }
  .startup-mark { position:relative;width:58px;height:58px;display:block;animation:startup-spin .82s linear infinite; }
  .startup-mark i,.startup-mark b { position:absolute;display:block;width:34px;height:34px;border:3px solid #172a45;border-radius:50%; }
  .startup-mark i { top:2px;left:2px; }.startup-mark b { right:2px;bottom:2px;border-color:#e6a527; }
  .sr-only { position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0; }
  @keyframes startup-spin { to { transform:rotate(360deg); } }
  :global(html.dark) .startup-loader { background:rgba(23,42,69,.98); }.startup-mark i { border-color:#172a45; }:global(html.dark) .startup-mark i { border-color:#fffdf7; }
  @media (prefers-reduced-motion:reduce) { .startup-mark { animation:none; } }
</style>
