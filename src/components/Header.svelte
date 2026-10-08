<script lang="ts">
  import { route } from '../state/router.svelte'
  import Icon, { type IconName } from './Icon.svelte'
  import SoundToggle from './SoundToggle.svelte'

  const NAV: { href: string; label: string; icon: IconName; match: string[] }[] = [
    { href: '#/', label: 'Learn', icon: 'cards', match: ['', 'study'] },
    { href: '#/table', label: 'Table', icon: 'table', match: ['table'] },
    {
      href: '#/practice',
      label: 'Practice',
      icon: 'pairs',
      match: ['practice', 'drills', 'listen', 'reading', 'write', 'sprint'],
    },
    { href: '#/stats', label: 'Stats', icon: 'chart', match: ['stats'] },
  ]

  const section = $derived(route.segments[0] ?? '')
</script>

<header class="header">
  <a class="logo" href="#/" title="kana — home">
    <span class="mark" aria-hidden="true">仮名</span>
    <span class="word">kana</span>
  </a>
  <nav class="nav" aria-label="Main">
    {#each NAV as item (item.href)}
      <a href={item.href} aria-current={item.match.includes(section) ? 'page' : undefined}>
        <Icon name={item.icon} size={20} />
        <span>{item.label}</span>
      </a>
    {/each}
  </nav>
  <div class="tools">
    <SoundToggle />
    <a
      class="btn icon ghost"
      href="#/settings"
      aria-label="Settings"
      title="Settings"
      aria-current={section === 'settings' ? 'page' : undefined}
    >
      <Icon name="gear" />
    </a>
  </div>
</header>

<style>
  .header {
    position: sticky;
    top: 0;
    z-index: 30;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.6rem clamp(0.75rem, 3vw, 2rem);
    padding-top: calc(0.6rem + env(safe-area-inset-top));
  }

  .logo {
    display: flex;
    align-items: baseline;
    gap: 0.55rem;
    text-decoration: none;
    color: #fff;
    text-shadow: 0 1px 8px rgb(0 0 0 / 0.35);
  }

  .mark {
    font-family: var(--font-heading);
    font-size: 1.05rem;
    color: #fff8f0;
    /* A fixed, deep vermilion so the seal keeps its contrast in both themes. */
    background: #b13a1c;
    padding: 0.2em 0.35em;
    border-radius: 6px;
    text-shadow: none;
    writing-mode: vertical-rl;
    letter-spacing: 0.05em;
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.25);
    align-self: center;
  }

  .word {
    font-family: var(--font-heading);
    font-size: 1.5rem;
    letter-spacing: 0.04em;
  }

  .nav {
    display: flex;
    gap: 0.25rem;
    margin: 0 auto;
    padding: 4px;
    border-radius: 999px;
    background: var(--panel);
    backdrop-filter: blur(16px) saturate(1.2);
    -webkit-backdrop-filter: blur(16px) saturate(1.2);
    box-shadow: var(--shadow-soft);
  }

  .nav a {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.5rem 1rem;
    border-radius: 999px;
    color: var(--ink-soft);
    text-decoration: none;
    font-weight: 560;
    font-size: 0.92rem;
    transition:
      background 0.2s,
      color 0.2s;
  }

  .nav a:hover {
    color: var(--ink);
  }

  .nav a[aria-current='page'] {
    background: var(--ink);
    color: var(--paper);
  }

  .tools {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 2px 6px;
    border-radius: 999px;
    background: var(--panel);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: var(--shadow-soft);
  }

  .tools a[aria-current='page'] {
    color: var(--shu);
  }

  @media (max-width: 720px) {
    .header {
      justify-content: space-between;
    }

    .nav {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      margin: 0;
      border-radius: 0;
      padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
      justify-content: space-around;
      background: var(--panel-strong);
      border-top: 1px solid var(--line);
    }

    .nav a {
      flex-direction: column;
      gap: 0.1rem;
      padding: 0.35rem 0.8rem;
      font-size: 0.7rem;
      border-radius: 12px;
    }
  }
</style>
