<script lang="ts">
  import { SCRIPT_CHOICES, type ScriptChoice } from '../lib/study/scripts'
  import { t } from '../state/i18n.svelte'
  import type { MessageKey } from '../lib/i18n/messages'

  /** Hiragana · Katakana · Both, for practice that can ask in either script. */
  let { value = $bindable() }: { value: ScriptChoice } = $props()
</script>

<div class="segmented" role="group" aria-label={t('common.scriptLabel')}>
  {#each SCRIPT_CHOICES as choice (choice)}
    <button aria-pressed={value === choice} onclick={() => (value = choice)}
      >{t(`common.${choice}` as MessageKey)}</button
    >
  {/each}
</div>
