<script lang="ts">
  import { t } from '../state/i18n.svelte'
</script>

<section class="panel" style="padding: 2rem; max-width: 520px">
  <p class="eyebrow">404</p>
  <h1>{t('misc.notFoundTitle')}</h1>
  <p>{t('misc.notFoundText')}</p>
  <a class="btn primary" href="#/">{t('misc.backHome')}</a>
</section>
