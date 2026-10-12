<script lang="ts">
  import { t } from '../state/i18n.svelte'
  import Icon from './Icon.svelte'

  /** The "Drawing" button: shows whether the memory-hint drawing is on, and toggles it. */
  let { on, ontoggle }: { on: boolean; ontoggle: () => void } = $props()
</script>

<button
  class="btn small toggle"
  aria-pressed={on}
  title={t('study.flashCard.drawingTitle')}
  onclick={(e) => {
    e.stopPropagation()
    ontoggle()
  }}><Icon name={on ? 'check' : 'image'} size={14} /> {t('common.drawing')}</button
>

<style>
  .toggle[aria-pressed='true'] {
    color: var(--ai);
    background: color-mix(in oklch, var(--ai) 14%, var(--panel-strong));
    border-color: color-mix(in oklch, var(--ai) 45%, transparent);
  }

  .toggle[aria-pressed='true']:hover {
    border-color: color-mix(in oklch, var(--ai) 65%, transparent);
  }
</style>
