<script lang="ts">
  import { onMount } from 'svelte'
  import Background from './components/Background.svelte'
  import Header from './components/Header.svelte'
  import InkDefs from './components/InkDefs.svelte'
  import Shortcuts from './components/Shortcuts.svelte'
  import Toasts from './components/Toasts.svelte'
  import { HEADING_FONT_ID } from './lib/data/fonts'
  import { loadFont } from './lib/ui/fontLoader'
  import { generateWashi } from './lib/ui/washi'
  import { settings, startPersistence } from './state/app.svelte'
  import { route, startRouter } from './state/router.svelte'
  import { ui } from './state/ui.svelte'
  import Credits from './views/Credits.svelte'
  import Drills from './views/Drills.svelte'
  import Home from './views/Home.svelte'
  import Listen from './views/Listen.svelte'
  import NotFound from './views/NotFound.svelte'
  import Practice from './views/Practice.svelte'
  import Reading from './views/Reading.svelte'
  import Settings from './views/Settings.svelte'
  import Stats from './views/Stats.svelte'
  import Study from './views/Study.svelte'
  import Table from './views/Table.svelte'

  let systemDark = $state(false)
  let systemReduce = $state(false)
  let shortcutsOpen = $state(false)

  onMount(() => {
    const stopRouter = startRouter()
    const stopPersistence = startPersistence()
    void loadFont(HEADING_FONT_ID)
    void loadFont(settings().font)

    const dark = matchMedia('(prefers-color-scheme: dark)')
    const reduce = matchMedia('(prefers-reduced-motion: reduce)')
    systemDark = dark.matches
    systemReduce = reduce.matches
    const onDark = () => (systemDark = dark.matches)
    const onReduce = () => (systemReduce = reduce.matches)
    dark.addEventListener('change', onDark)
    reduce.addEventListener('change', onReduce)
    return () => {
      stopRouter()
      stopPersistence()
      dark.removeEventListener('change', onDark)
      reduce.removeEventListener('change', onReduce)
    }
  })

  const theme = $derived(
    settings().theme === 'system' ? (systemDark ? 'dark' : 'light') : settings().theme,
  )
  const reduceMotion = $derived(
    settings().reducedMotion === 'system' ? systemReduce : settings().reducedMotion === 'on',
  )

  $effect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.dataset.motion = reduceMotion ? 'reduce' : 'full'
    const texture = generateWashi({ dark: theme === 'dark' })
    root.style.setProperty('--washi-texture', texture ? `url(${texture})` : 'none')
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#2a2722' : '#f4efe6')
  })

  function onKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement
    if (target.closest('input, textarea, select, [contenteditable]')) return
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key === 'm' || e.key === 'M') {
      settings().sfx = !settings().sfx
    } else if (e.key === '?') {
      shortcutsOpen = !shortcutsOpen
    }
  }

  const view = $derived(route.segments[0] ?? '')
</script>

<svelte:window onkeydown={onKeydown} />

<InkDefs />
<Background />

<div class="shell" class:focus={ui.focus}>
  <Header />
  <main id="main">
    {#if view === ''}
      <Home />
    {:else if view === 'study'}
      {#key route.segments.join('/') + JSON.stringify(route.query)}
        <Study />
      {/key}
    {:else if view === 'table'}
      <Table />
    {:else if view === 'practice'}
      <Practice />
    {:else if view === 'drills'}
      <Drills />
    {:else if view === 'listen'}
      {#key route.segments.join('/')}
        <Listen />
      {/key}
    {:else if view === 'reading'}
      <Reading />
    {:else if view === 'stats'}
      <Stats />
    {:else if view === 'settings'}
      <Settings />
    {:else if view === 'credits'}
      <Credits />
    {:else}
      <NotFound />
    {/if}
  </main>
</div>

<Toasts />
<Shortcuts bind:open={shortcutsOpen} />

<style>
  .shell {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }

  main {
    flex: 1;
    width: 100%;
    max-width: 1120px;
    margin: 0 auto;
    padding: clamp(0.75rem, 2.5vw, 2rem) clamp(0.75rem, 3vw, 2rem) 5rem;
  }

  @media (max-width: 720px) {
    main {
      padding-bottom: calc(96px + env(safe-area-inset-bottom));
    }
  }
</style>
