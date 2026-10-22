<script lang="ts">
  import { RULES_BY_ID, localRule, type RuleId } from '../lib/data/rules'
  import { lang, t } from '../state/i18n.svelte'

  /** A word's pronunciation rules: tap a title to read the rule. */
  let { rules, open = [] }: { rules: readonly RuleId[]; open?: readonly RuleId[] } = $props()
</script>

{#if rules.length}
  <ul class="rule-list">
    {#each rules as id (id)}
      {@const rule = localRule(RULES_BY_ID.get(id)!, lang())}
      <li>
        <details open={open.includes(id)}>
          <summary>{rule.title}</summary>
          {#each rule.body as paragraph, i (i)}<p>{paragraph}</p>{/each}
          <a href="#/rules?rule={id}">{t('rules.more')}</a>
        </details>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .rule-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.35rem;
    text-align: left;
  }

  details {
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 0.4rem 0.8rem;
    background: color-mix(in srgb, var(--paper) 60%, transparent);
  }

  summary {
    cursor: pointer;
    font-weight: 600;
    font-size: 0.92rem;
  }

  details p {
    margin: 0.4rem 0;
    font-size: 0.88rem;
    line-height: 1.5;
    color: var(--ink-soft);
  }

  details a {
    font-size: 0.85rem;
    color: var(--ink);
  }
</style>
