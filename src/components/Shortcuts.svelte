<script lang="ts">
  import Modal from './Modal.svelte'
  import { t } from '../state/i18n.svelte'

  let { open = $bindable(false) }: { open?: boolean } = $props()

  const SHORTCUT_KEYS = [
    'Space',
    '1 – 4',
    'Enter',
    'P',
    'S',
    'F',
    '← / →',
    'M',
    'Esc',
    '?',
  ] as const

  const SHORTCUT_DESC_KEY = [
    'misc.shortcutReveal',
    'misc.shortcutGrade',
    'misc.shortcutAccept',
    'misc.shortcutPlay',
    'misc.shortcutStrokes',
    'misc.shortcutFonts',
    'misc.shortcutNav',
    'misc.shortcutMute',
    'misc.shortcutLeave',
    'misc.shortcutHelp',
  ] as const
</script>

<Modal bind:open title={t('misc.shortcutsTitle')}>
  <dl class="shortcuts">
    {#each SHORTCUT_KEYS as key, i (key)}
      <dt><kbd>{key}</kbd></dt>
      <dd>{t(SHORTCUT_DESC_KEY[i])}</dd>
    {/each}
  </dl>
</Modal>

<style>
  .shortcuts {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.6rem 1.2rem;
    margin: 0;
  }

  dt {
    text-align: right;
  }

  dd {
    margin: 0;
    color: var(--ink-soft);
  }
</style>
