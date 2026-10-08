<script lang="ts">
  import { onMount, type Component } from 'svelte'
  import Background from './components/Background.svelte'
  import Header from './components/Header.svelte'
  import InkDefs from './components/InkDefs.svelte'
  import Shortcuts from './components/Shortcuts.svelte'
  import Toasts from './components/Toasts.svelte'
  import { HEADING_FONT_ID } from './lib/data/fonts'
  import { loadFont } from './lib/ui/fontLoader'
  import { WASHI_VARIANTS, generateWashi } from './lib/ui/washi'
  import { dayKey } from './lib/srs/queue'
  import { goalProgress } from './lib/study/goal'
  import { audio, settings, startPersistence, store } from './state/app.svelte'
  import { startSync } from './state/sync.svelte'
  import { toast, ui } from './state/ui.svelte'
  import { route, startRouter } from './state/router.svelte'
  import Home from './views/Home.svelte'

  // Secondary pages are loaded on demand to keep the first load small.
  const LAZY = {
    study: () => import('./views/Study.svelte'),
    table: () => import('./views/Table.svelte'),
    practice: () => import('./views/Practice.svelte'),
    drills: () => import('./views/Drills.svelte'),
    listen: () => import('./views/Listen.svelte'),
    write: () => import('./views/Write.svelte'),
    sprint: () => import('./views/Sprint.svelte'),
    reading: () => import('./views/Reading.svelte'),
    stats: () => import('./views/Stats.svelte'),
    settings: () => import('./views/Settings.svelte'),
    credits: () => import('./views/Credits.svelte'),
    notfound: () => import('./views/NotFound.svelte'),
  } satisfies Record<string, () => Promise<{ default: Component }>>

  let systemDark = $state(false)
  let systemReduce = $state(false)
  let shortcutsOpen = $state(false)

  onMount(() => {
    const stopRouter = startRouter()
    const stopPersistence = startPersistence()
    const stopSync = startSync(() => ui.focus)
    void loadFont(HEADING_FONT_ID)
    // The card font is large; load it once the page is up so it doesn't compete with the first paint.
    const idle = window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 300))
    idle(() => void loadFont(settings().font))

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
      stopSync()
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
    // The paper texture is generated when the browser is idle, so it never delays the first paint.
    const dark = theme === 'dark'
    const idle = window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 200))
    // One sheet per idle callback, so generating all of them never blocks the page.
    WASHI_VARIANTS.forEach((variant, i) =>
      idle(() => {
        const texture = generateWashi({ ...variant, dark })
        root.style.setProperty(`--washi-${i}`, texture ? `url(${texture})` : 'none')
      }),
    )
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

  // Celebrate the daily goal once a day, whichever mode reaches it.
  $effect(() => {
    void store.data.log.length
    const today = dayKey()
    if (store.data.goalDay === today || !goalProgress(store.data).reached) return
    store.data.goalDay = today
    void audio.playSfx('milestone')
    toast(`Daily goal reached: ${store.data.settings.dailyGoal} answers. おみごと!`)
  })

  // A soft wooden tick when moving between pages (only if enabled in settings).
  let firstRoute = true
  $effect(() => {
    void view
    if (firstRoute) firstRoute = false
    else void audio.playSfx('tick')
  })
</script>

<svelte:window onkeydown={onKeydown} />

<InkDefs />
<Background />

<div class="shell" class:focus={ui.focus}>
  <Header />
  <main id="main">
    {#if view === ''}
      <Home />
    {:else}
      {@const key = (view in LAZY ? view : 'notfound') as keyof typeof LAZY}
      {#key key === 'study' ? route.segments.join('/') + JSON.stringify(route.query) : ['listen', 'write', 'sprint'].includes(key) ? route.segments.join('/') : key}
        {#await LAZY[key]() then mod}
          <mod.default />
        {/await}
      {/key}
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

    /* Study sessions get the whole screen on phones. */
    .shell.focus :global(.nav) {
      display: none;
    }

    .shell.focus main {
      padding-bottom: calc(24px + env(safe-area-inset-bottom));
    }
  }
</style>
