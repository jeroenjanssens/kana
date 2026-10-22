# Version number, pronunciation rules and more words: plan

> **Status (2026-10-22): implemented.** Where the build differs from this plan:
> - **Rule order:** with 507 words, the order within the levels follows the new counts: long vowels (73 words) now come before small ゃゅょ (56), rendaku before ぢ/づ, and the soft g (24) leads level 3. Each rule shows how many practice words use it.
> - **Silent vowels** are detected from the spelling, using the conditions from Wikipedia's *Japanese phonology*, instead of being marked by hand; all 59 words were checked by hand. Rendaku and particles are marked by hand.
> - **Pitch accent:** VOICEVOX's own pitch was too subtle, especially in the male voice, so the pitch examples set the melody explicitly (about five semitones) with a larger intonation scale. Measured in all eight recordings: high-low and low-high as intended.
> - **Rules on the back of a card** sit below the answer buttons, so answering never needs scrolling. The old reading notes are replaced by the rules; rules you'd already seen as notes count as seen.
> - **Rule examples** that became practice words (ビル, きって, とうきょう…) use the word's recording; 15 examples keep their own.

Four parts, each in its own commit, pushed only when asked:

1. A version number in the bottom-left corner that checks for updates when clicked.
2. A page of pronunciation rules, with examples in both voices.
3. At least 500 practice words (now 392), with recordings in both voices, and which rules each word uses.
4. A card for every word: clickable words on the Reading page, and the rules on the back of the card during Reading practice.

---

## 1. Version number

**Numbering**
- The version is the GitHub Actions run number of the "Test and deploy" run that built it, so version 41 is run 41 in the Actions tab.
- CI sets it when building (`KANA_VERSION`); nothing is bumped by hand. Local builds show "dev".
- Runs that don't deploy (a failed run, a pull request) skip a number.

**Display**
- Bottom-left: "v41", in the same small white text with shadow as the photo credit (bottom-right), and shown and hidden like it.
- On phones the photo credit is hidden (there's a bottom bar), so the version goes at the bottom of Settings there: "Version 41 · Check for updates".

**Click to update**
- Each build also writes `version.json`. It isn't precached by the service worker, so it always comes from the server.
- Clicking the version fetches that file (no cache) and compares it with the running version:
  - **Newer:** install the new version and reload right away, with the message "Updating to version 43…".
  - **Same:** "You have the latest version (41)".
  - **Offline or error:** "Couldn't check for updates".
- The existing "A new version of kana is available" message stays.

**Tests**
- Unit: comparing versions, and the three outcomes.
- End to end: the corner shows a version, and clicking it reports the latest version.

---

## 2. Pronunciation rules

**Where**
- A new page, Pronunciation rules (`#/rules`), with its own button in the main menu, between Table and Practice ("Rules"; on phones also in the bottom bar).
- Linked from kana details for kana that have a rule (ん, は, へ, を, ふ, づ, ぢ, the r-row, kana with small ゃ ゅ ょ…), and from the word card and Reading practice (part 4).

**Each rule has**
- a title and a short explanation;
- a "how common" label;
- examples in kana and romaji, each with two play buttons, Female and Male (the chosen voice first). Examples come from the practice words where possible; tapping an example word opens its word card (part 4).

The existing notes (small っ, ー, long vowels, ゃゅょ, dakuten, small foreign vowels) become part of this list. Everything is in English and Dutch.

**The rules, in three levels.** Within a level, rules are ordered by how often they occur. The percentages are the share of the current 392 practice words that use each rule.

*Level 1: you'll need these from the start*
1. Dakuten ゛ and handakuten ゜: k→g, s→z, t→d, h→b/p. (35%)
2. The r-row: a quick tap of the tongue, between r, l and d. (23%)
3. ん is a full beat, and changes with the next sound: m before m/b/p (さんぽ *sampo*), ng before k/g (ぎんこう), nasal at the end of a word. (20%)
4. Small ゃ ゅ ょ merge into one syllable (きゃ *kya*). (12%)
5. ー in katakana makes a vowel long (コーヒー). (10%)
6. Long vowels in hiragana: ああ, いい, うう; えい and ええ are said ē; おう and おお are said ō. (9%, plus 6% for おう)
7. Small っ doubles the next consonant (がっこう *gakkō*). (6%)
8. The particles は, へ, を are said *wa*, *e*, *o*. (Not in single words, but in almost every sentence.)
9. Every kana is one beat; long vowels, っ and ん count as a beat too, which gives Japanese its even rhythm.

*Level 2: common, good to know soon*

10. Vowels that go silent: i and u between voiceless consonants, or at the end of a word, are barely voiced. です sounds like *des*, すき like *ski*. (About 11%.)
11. Sounds that differ from the romaji: ふ (lips, not teeth), し, ち, つ, and う (lips not rounded). (ふ alone: 4%.)
12. Small vowels for foreign sounds: ファ, ティ, ウィ, and ヴ. (3%)
13. ぢ and づ sound like じ and ず; they're mostly used when a sound changes in a compound (はなぢ, つづく).
14. Rendaku: in compounds the second part often becomes voiced (て + かみ → てがみ). This explains spellings like those in 13.

*Level 3: rare or advanced*

15. ん before a vowel or y is written *n'* in romaji: きんえん *kin'en* is not きねん *kinen*. (1%)
16. おお instead of おう in some words (おおきい, とおい): the same sound, spelled differently.
17. Small っ at the end (あっ!) is a sudden stop.
18. Pitch accent: Japanese uses high and low pitch rather than stress; はし can mean "chopsticks" or "bridge".
19. The g-sound in the middle of words: some speakers say が as a soft *nga*. It's optional and becoming less common.
20. Old and special characters: ゝゞヽヾ (repeat marks), ゐ ゑ (no longer used), small ヶ (said *ka* or *ga*, as in 3ヶ月).

**Research.** The percentages come from counting the current word list; the count for silent vowels is an estimate, because it depends on the sounds on both sides. The rules and explanations are from my own knowledge for now. While implementing, I'll check each one against sources such as Wikipedia's *Japanese phonology* and Tofugu's guides, list those sources on the page, and correct anything that turns out different. The order is checked again once the word list has grown (part 3).

**Audio for examples that aren't practice words**
- Examples such as particles in a short phrase (わたしは), the *kin'en*/*kinen* pair, あっ, and the two pitch accents of はし are generated with VOICEVOX, in the same two voices, through a new section of `scripts/generate-audio.ts` (`just voicevox`, then `just audio`).
- They go in `public/audio/{female,male}/rules/NN.mp3`: about 30–40 short phrases, roughly 1 MB for both voices. Like word recordings, they're stored for offline use the first time they're played.
- Pitch accent: VOICEVOX can set where the pitch drops, so はし is made as high-low (chopsticks) and low-high (bridge). The pitch is checked by measuring it in the recordings; you'll still want to listen to confirm.

**Tests**
- Every rule has a Dutch translation.
- Every example has a recording in both voices, and each play button plays the right file.
- End to end: open the page from the menu, and play an example in each voice.

---

## 3. More words, and which rules each word uses

**At least 500 words**
- At least 108 new words, added at the end of the list so the existing 784 recordings keep their numbers. Words unlock once you know their kana, so their place in the list hardly matters for practice.
- The new words are chosen first for the rules with few examples. Now: ん before a vowel (2 words), えい (4), ぢ/づ (1), ヴ (0), ん before m/b/p (10), small foreign vowels (10), ふ (16), small っ (23).
- The goal is at least 8 practice words per rule, where real, common words exist. Particles, pitch accent pairs and repeat marks can't be practised with single words; they only have examples on the rules page.
- Only common, real words that suit a beginner, each with an English and a Dutch meaning. A word can use several rules.
- Every new word is recorded in both voices with VOICEVOX, like the existing ones: about 216 new recordings.

**Which rules a word uses**
- Each word gets a list of rules, replacing the current tags (`sokuon`, `choon`, …).
- Detected automatically from the kana and romaji: dakuten and handakuten, the r-row, ん before m/b/p, k/g, a vowel or the end of a word, ゃゅょ, ー, long vowels (including えい, おう and おお), small っ, small foreign vowels, ヴ, ぢ/づ and ふ.
- Decided by hand per word: silent vowels (whether the i or u really goes silent depends on the sounds around it and the word's pitch accent) and rendaku (you have to know what the word is made of).

**Tests**
- Every rule that can be practised has at least 8 words.
- Automatic detection gets a list of tricky words right (for example きんえん, がっこう, せんせい, おおきい).
- The rules decided by hand only use rules that exist.
- Every word has a Dutch meaning and a recording in both voices.

---

## 4. The word card

**One shared component** (`WordCard.svelte`, with `RuleList.svelte` for the rules), used in three places.

**On the Reading page**
- Every word in the list becomes a button that opens its card in a dialog, the same way kana details open from the Table. The card shows:
  - the word, large, in kana, with its romaji and meaning (English or Dutch);
  - play buttons for both voices, the chosen voice first;
  - the rules this word uses, each with a short explanation and a link to the full rule;
  - the kana it's made of; tapping one opens that kana's details;
  - your progress with this word: how often you've seen it and got it right. This is also where the green colour in the list is explained.
- Words under "Next to unlock" can be opened too; their card also says which kana you still need.

**During Reading practice**
- After you answer, the back of the card shows every rule the word uses, each as a short title; tapping one opens its explanation.
- The first time you meet a rule, its explanation is shown open, like the notes now; after that only its title.

**On the rules page**
- Tapping an example word opens its word card.

**Tests**
- End to end: open a word from the list, play it in both voices, see its rules, and open one of its kana. Answer a word in Reading practice and see its rules on the back.
