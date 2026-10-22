<script lang="ts">
  import { tick } from 'svelte'
  import VoiceButtons from '../components/VoiceButtons.svelte'
  import { RULES, RULE_SOURCES, localRule, type RuleLevel } from '../lib/data/rules'
  import type { MessageKey } from '../lib/i18n/messages'
  import { playExample } from '../lib/study/examples'
  import { audio } from '../state/app.svelte'
  import { route } from '../state/router.svelte'
  import { lang, t } from '../state/i18n.svelte'

  const LEVELS: RuleLevel[] = [1, 2, 3]
  const rules = $derived(RULES.map((r) => localRule(r, lang())))

  // #/rules?rule=sokuon opens the page at that rule.
  $effect(() => {
    const id = route.query.rule
    if (!id) return
    void tick().then(() => {
      document.getElementById(`rule-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  })
</script>

<header class="page-head">
  <p class="eyebrow light">{t('rules.eyebrow')}</p>
  <h1>{t('rules.heading')}</h1>
  <p class="lead">{t('rules.lead')}</p>
</header>

<nav class="panel toc" aria-label={t('rules.contents')}>
  {#each LEVELS as level (level)}
    <div>
      <h2>{t(`rules.level${level}` as MessageKey)}</h2>
      <ol start={rules.findIndex((r) => r.level === level) + 1}>
        {#each rules.filter((r) => r.level === level) as rule (rule.id)}
          <li><a href="#/rules?rule={rule.id}">{rule.title}</a></li>
        {/each}
      </ol>
    </div>
  {/each}
</nav>

{#each LEVELS as level (level)}
  <section class="level">
    <h2 class="level-head">
      {t(`rules.level${level}` as MessageKey)}
      <small>{t(`rules.level${level}Desc` as MessageKey)}</small>
    </h2>
    {#each rules.filter((r) => r.level === level) as rule (rule.id)}
      <article
        class="panel rule"
        id="rule-{rule.id}"
        class:current={route.query.rule === rule.id}
        aria-labelledby="title-{rule.id}"
      >
        <h3 id="title-{rule.id}">
          <span class="number">{rules.indexOf(rule) + 1}</span>
          {rule.title}
        </h3>
        {#each rule.body as paragraph, i (i)}<p>{paragraph}</p>{/each}
        <ul class="examples">
          {#each rule.examples as example, i (i)}
            <li>
              <span class="kana" lang="ja">{example.kana}</span>
              <span class="romaji">{example.romaji}</span>
              <span class="note">{example.note}</span>
              <VoiceButtons
                label={example.kana}
                play={(voice) => void playExample(audio, example, voice)}
              />
            </li>
          {/each}
        </ul>
      </article>
    {/each}
  </section>
{/each}

<section class="panel sources">
  <h2>{t('rules.sources')}</h2>
  <p class="muted">{t('rules.sourcesBody')}</p>
  <ul>
    {#each RULE_SOURCES as source (source.url)}
      <li><a href={source.url} target="_blank" rel="noopener">{source.title}</a></li>
    {/each}
  </ul>
</section>

<style>
  .page-head {
    color: #fff;
    text-shadow: 0 2px 14px rgb(0 0 0 / 0.45);
    margin-bottom: 1rem;
  }

  .eyebrow.light {
    color: rgb(255 255 255 / 0.85);
  }

  .lead {
    max-width: 62ch;
  }

  .toc {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.5rem 1.5rem;
    padding: 1.1rem 1.4rem;
    margin-bottom: 1.5rem;
  }

  .toc h2 {
    font-size: 0.95rem;
    margin: 0 0 0.3rem;
  }

  .toc ol {
    margin: 0;
    padding-left: 1.6rem;
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .toc a {
    color: var(--ink);
  }

  .level {
    display: grid;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .level-head {
    color: #fff;
    text-shadow: 0 2px 10px rgb(0 0 0 / 0.5);
    margin: 0.5rem 0 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.6rem;
  }

  .level-head small {
    font-size: 0.85rem;
    font-weight: 500;
    color: rgb(255 255 255 / 0.85);
  }

  .rule {
    padding: 1.2rem 1.4rem;
    /* Room for the menu bar, which stays at the top. */
    scroll-margin-top: 5.5rem;
    max-width: 860px;
  }

  .rule.current {
    outline: 2px solid var(--shu);
  }

  .rule h3 {
    margin: 0 0 0.5rem;
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
  }

  .number {
    font-family: var(--font-heading);
    color: var(--shu);
  }

  .rule p {
    margin: 0 0 0.6rem;
    max-width: 70ch;
    line-height: 1.55;
  }

  .examples {
    list-style: none;
    margin: 0.8rem 0 0;
    padding: 0;
    display: grid;
    gap: 0.45rem;
  }

  .examples li {
    display: grid;
    grid-template-columns: minmax(6.5rem, auto) minmax(6rem, auto) 1fr auto;
    align-items: center;
    gap: 0.4rem 0.9rem;
    padding-top: 0.45rem;
    border-top: 1px solid var(--line);
  }

  .kana {
    font-family: var(--font-kana);
    font-size: 1.35rem;
  }

  .romaji {
    font-weight: 600;
  }

  .note {
    color: var(--ink-soft);
    font-size: 0.9rem;
  }

  @media (max-width: 640px) {
    .examples li {
      grid-template-columns: auto 1fr auto;
    }

    .note {
      grid-row: 2;
      grid-column: 1 / -1;
    }
  }

  .sources {
    padding: 1.1rem 1.4rem;
    max-width: 860px;
  }

  .sources h2 {
    margin: 0 0 0.3rem;
  }

  .sources ul {
    margin: 0.4rem 0 0;
    padding-left: 1.2rem;
  }
</style>
