import type { RuleId } from '../rules'

/** Dutch versions of the pronunciation rules: title, paragraphs, and a note per example. */
export const rulesNl: Record<RuleId, { title: string; body: string[]; notes: string[] }> = {
  dakuten: {
    title: 'Dakuten ゛ en handakuten ゜',
    body: [
      'Twee kleine streepjes rechtsboven (dakuten) maken een klank stemhebbend: k wordt g, s wordt z, t wordt d en h wordt b. Een klein rondje (handakuten) maakt van de h-rij een p.',
      'じ en ぢ zeg je allebei als ji, en ず en づ allebei als zu (zie “ぢ en づ”).',
    ],
    notes: [
      'sleutel: き ki → ぎ gi',
      'familie: そ so → ぞ zo',
      'raam: と to → ど do',
      'varken: ふ fu → ぶ bu',
      'potlood: ひ hi → ぴ pi',
    ],
  },
  r: {
    title: 'De r-klank',
    body: [
      'De Japanse r is één snelle tik van de tongpunt net achter de boventanden, zoals de tt in het Amerikaanse “butter”. Hij ligt ergens tussen r, l en d in, en wordt nooit gerold of achter in de keel gemaakt.',
    ],
    notes: ['lucht', 'kersenbloesem', 'vogel', 'zwart', 'nacht'],
  },
  n: {
    title: 'ん is een eigen tel',
    body: [
      'ん is de enige kana zonder klinker, maar telt toch als een volle tel. Hoe hij klinkt, hangt af van de klank erna:',
      'voor m, b en p is het een m (さんぽ klinkt als “sampo”); voor k en g de ng van “zing”; voor t, d, n en r een n; voor een klinker, y, w, s of h raakt de tong niets en is het een nasale klinker; aan het eind van een woord een zachte n, verder achter in de mond.',
      'De romaji in deze app schrijft altijd n.',
    ],
    notes: [
      'wandeling: klinkt als “sampo”',
      'krant: klinkt als “shimbun”',
      'appel: ng zoals in “zing”',
      'gezond, goed: ng',
      'boek: een zachte n aan het eind',
    ],
  },
  yoon: {
    title: 'Klein ゃ ゅ ょ smelt samen tot één klank',
    body: [
      'Een kleine ゃ, ゅ of ょ na een kana uit de i-rij (き, し, ち, に, ひ, み, り en hun vormen met dakuten) smelt daarmee samen tot één lettergreep, en één tel.',
      'De grootte telt: met een gewone や, ゆ of よ zijn het twee tellen, en een ander woord.',
    ],
    notes: [
      'thee: ち + ゃ → ちゃ cha',
      'foto: し + ゃ → しゃ sha',
      'honderd: ひ + ゃ → ひゃ hya',
      'ziekenhuis: drie lettergrepen, びょ-う-い-ん',
      'schoonheidssalon: met een grote よ, び-よ-う-い-ん',
    ],
  },
  choon: {
    title: 'ー maakt een klinker lang',
    body: [
      'In katakana rekt het streepje ー de klinker ervoor uit tot twee keer zo lang: twee tellen. Romaji zet een streepje boven de klinker (ō) of schrijft hem dubbel (ii).',
      'De lengte verandert de betekenis: ビル is een gebouw, ビール is bier.',
    ],
    notes: ['koffie', 'taart', 'ramen', 'gebouw: korte i', 'bier: lange ī'],
  },
  'long-vowel': {
    title: 'Lange klinkers in hiragana',
    body: [
      'Hiragana heeft geen teken voor een lange klinker: je maakt een klinker lang door er nog een te schrijven. ああ is ā, いい is ī en うう is ū.',
      'Voor een lange e schrijf je meestal い: えい zeg je als ē (せんせい klinkt als “sensē”), al schrijft de romaji hier ei. Voor een lange o schrijf je meestal う: おう zeg je als ō. Een paar woorden gebruiken ええ of おお (zie “おお in plaats van おう”).',
      'Een lange klinker duurt twee tellen, en de lengte verandert de betekenis: おばさん is tante, おばあさん oma. Horen de twee klinkers bij verschillende delen van een woord, dan houdt elk zijn eigen klank, zoals in おもう o-mo-u (denken).',
    ],
    notes: [
      'moeder: ああ → ā',
      'nee: いい → ī',
      'leraar: えい → ē',
      'school: おう → ō',
      'tante: korte a',
      'oma: lange ā',
    ],
  },
  sokuon: {
    title: 'Kleine っ verdubbelt de volgende medeklinker',
    body: [
      'Een kleine っ (ッ in katakana) zeg je niet als “tsu”. Het is een korte pauze van één tel, die de medeklinker erna verdubbelt, zoals in het midden van “boekkast”.',
      'Romaji schrijft de medeklinker dubbel: っか is kka, っし is sshi, en っち is tchi (まっちゃ matcha).',
    ],
    notes: [
      'school',
      'kaartje',
      'tijdschrift',
      'kom!: geen pauze',
      'postzegel: een pauze voor de t',
    ],
  },
  particles: {
    title: 'は, へ en を als partikel',
    body: [
      'Drie kana zeg je anders als ze een partikel zijn, de kleine woordjes die de rol van een woord in de zin aangeven: は zeg je als wa, へ als e en を als o.',
      'Overal anders houden は en へ hun eigen klank (はな hana, へや heya). を wordt alleen als partikel gebruikt.',
    ],
    notes: [
      'ik (als onderwerp)',
      'hallo: eindigt op het partikel は',
      'naar school',
      'water (als lijdend voorwerp)',
    ],
  },
  mora: {
    title: 'Elke kana is één tel',
    body: [
      'Japans heeft een gelijkmatig ritme: elke kana duurt ongeveer even lang, een tel (een mora). Lange klinkers, een kleine っ en ん tellen ook elk als een tel; kleine ゃ ゅ ょ en kleine klinkers niet, die horen bij de kana ervoor.',
      'Zo is にっぽん vier tellen, に-っ-ぽ-ん, en とうきょう ook vier, と-う-きょ-う, en niet twee lettergrepen zoals in het Nederlands.',
    ],
    notes: [
      'Japan: に-っ-ぽ-ん, vier tellen',
      'Tokio: と-う-きょ-う, vier tellen',
      'bank: ぎ-ん-こ-う, vier tellen',
    ],
  },
  devoicing: {
    title: 'Klinkers die stil worden',
    body: [
      'In standaard Japans worden i en u vaak gefluisterd of weggelaten tussen twee stemloze medeklinkers (k, s, t, p, en sh, ch, ts, f, h), of aan het eind van een woord na zo’n medeklinker. です klinkt als “des”, すき als “ski” en ひと als “h’to”.',
      'Voor een h gebeurt het niet, en meestal niet in twee tellen achter elkaar. Het hoort bij natuurlijk spreken, maar je wordt net zo goed begrepen als je de klinker wel zegt, en de romaji schrijft hem altijd.',
    ],
    notes: [
      'leuk vinden: klinkt als “ski”',
      'persoon: de i wordt gefluisterd',
      'schoenen: de eerste u wordt gefluisterd',
      'is, ben, zijn: klinkt als “des”',
      'gezegd voor het eten: “itadakimas”',
    ],
  },
  sounds: {
    title: 'Klanken die anders zijn dan de romaji',
    body: [
      'ふ is geen Nederlandse f: je blaast zachtjes door bijna gesloten lippen, zonder je tanden te raken. Hij ligt tussen f en h in.',
      'う zeg je met ontspannen lippen, niet naar voren getuit. つ is de ts van “iets”, ook aan het begin van een woord. し en ち zijn zachter dan het Nederlandse “sji” en “tsji”, met een plattere tong.',
    ],
    notes: [
      'schip: ふ tussen f en h',
      'winter',
      'maan: ts aan het begin',
      'sushi: ontspannen u',
      'mond',
    ],
  },
  'small-vowels': {
    title: 'Kleine klinkers voor buitenlandse klanken',
    body: [
      'Katakana gebruikt een kleine ァ, ィ, ゥ, ェ of ォ na een kana voor klanken die het Japans niet heeft: ファ fa, フィ fi, ティ ti, ディ di, ウィ wi, ウェ we, シェ she, チェ che. Net als kleine ゃ ゅ ょ vormt de kleine klinker samen met de kana ervoor één tel.',
      'ヴ (ウ met dakuten) schrijft een v, maar de meeste mensen zeggen hem als een b.',
    ],
    notes: [
      'vork: フォ fo',
      'café: フェ fe',
      'feest: ティ ti',
      'web: ウェ we',
      'viool: ヴァ, vaak gezegd als “baiorin”',
    ],
  },
  'ji-zu': {
    title: 'ぢ en づ',
    body: [
      'ぢ klinkt precies als じ (ji), en づ als ず (zu). Je schrijft ze vooral als een ち of つ stemhebbend wordt in een samenstelling (zie “Klanken die veranderen in samenstellingen”), of als ち of つ herhaald wordt: ちぢむ, つづく.',
      'Typ ze als di en du.',
    ],
    notes: [
      'doorgaan: つ + づ',
      'bloedneus: はな (neus) + ち (bloed)',
      'maansikkel: みか + つき (maan)',
      'krimpen',
    ],
  },
  rendaku: {
    title: 'Klanken die veranderen in samenstellingen (rendaku)',
    body: [
      'Als twee woorden samengevoegd worden, wordt de eerste klank van het tweede woord vaak stemhebbend: て (hand) + かみ (papier) → てがみ (brief). Dit heet rendaku.',
      'Het gebeurt niet altijd, en er is geen eenvoudige regel voor wanneer wel, dus je leert het per woord. Het verklaart waarom sommige woorden met ぢ of づ geschreven worden.',
    ],
    notes: [
      'brief: て + かみ',
      'vriend: とも + たち',
      'ingang: いり + くち (mond)',
      'mensen: ひと + ひと',
    ],
  },
  'n-apostrophe': {
    title: 'ん voor een klinker of y',
    body: [
      'Als ん voor een klinker of y staat, schrijft romaji n’ om te laten zien waar de tellen splitsen: きんえん kin’en (niet roken) is vier tellen, きねん kinen (jubileum) maar drie. Zo is ほんや hon’ya (boekwinkel) ook geen ほにゃ.',
      'Typ nn voor een ん voor een klinker.',
    ],
    notes: ['niet roken: き-ん-え-ん', 'jubileum: き-ね-ん', 'boekwinkel: ほ-ん-や'],
  },
  oo: {
    title: 'おお in plaats van おう',
    body: [
      'Een lange o schrijf je meestal als おう, maar een aantal gewone woorden gebruikt おお: おおきい (groot), おおい (veel), とおい (ver), とおる (passeren), こおり (ijs), おおかみ (wolf). Je zegt ze allebei als ō. In deze woorden stond vroeger een h- of w-klank tussen de twee klinkers.',
      'Zo schrijven een paar woorden een lange e als ええ: ええ (ja), おねえさん (oudere zus).',
    ],
    notes: ['groot', 'ver', 'ijs', 'oudere zus: ええ → ē'],
  },
  'final-sokuon': {
    title: 'Kleine っ aan het eind',
    body: [
      'Aan het eind van een woord valt er voor een kleine っ niets te verdubbelen. Daar betekent hij een korte, plotselinge stop, zoals wanneer je een kreet van verbazing afbreekt.',
    ],
    notes: ['o!', 'wat?'],
  },
  pitch: {
    title: 'Toonhoogte (pitch accent)',
    body: [
      'Japans legt geen klemtoon op een lettergreep: elke tel is hoog of laag, en woorden hebben hun eigen melodie. Sommige woorden verschillen alleen in die melodie: はし is eetstokjes als het van hoog naar laag gaat, en brug als het van laag naar hoog gaat.',
      'Kana laten de toonhoogte niet zien, en die verschilt per streek; woordenboeken geven de standaard (Tokio). Je leert het door te luisteren, en je wordt ook zonder begrepen.',
    ],
    notes: ['eetstokjes: hoog-laag', 'brug: laag-hoog', 'regen: hoog-laag', 'snoep: laag-hoog'],
  },
  'nasal-g': {
    title: 'Een zachte g midden in woorden',
    body: [
      'Van oudsher zegt standaard Japans een g binnen een woord, en het partikel が, door de neus, als de ng in “zanger”: かがみ ka-nga-mi.',
      'Nog maar een minderheid van de sprekers doet dit consequent, het verdwijnt al tientallen jaren, en jongere sprekers zeggen meestal een gewone g. Allebei is goed; de stemmen van de app zeggen een gewone g.',
    ],
    notes: ['sleutel: ook gezegd als “kangi”', 'ei: ook gezegd als “tamango”'],
  },
  special: {
    title: 'Zeldzame en oude tekens',
    body: [
      'ゝ en ゞ (ヽ en ヾ in katakana) herhalen de kana ervoor; ゞ voegt een dakuten toe. Je ziet ze vooral in namen zoals いすゞ (Isuzu).',
      'ゐ (wi) en ゑ (we) zijn oude kana, die je nu als i en e zegt. Ze leven voort in namen zoals ヱビス (Yebisu-bier).',
      'Een kleine ヶ zeg je als ka (en soms ga), zoals in 三ヶ月 sankagetsu (drie maanden).',
    ],
    notes: [
      'Isuzu: ゞ herhaalt す met een dakuten',
      'Yebisu: ヱ zeg je als e',
      'drie maanden: ヶ zeg je als ka',
    ],
  },
}
