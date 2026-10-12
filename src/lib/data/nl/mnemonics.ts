/** A hint of several paragraphs. */
function paragraphs(...texts: string[]): string {
  return texts.join('\n\n')
}

/**
 * Dutch memory hints for the basic kana (the sound in *asterisks*), keyed by kana id, translated
 * from Tofugu's Learn Hiragana and Learn Katakana books, keeping the English word where the pun
 * needs it.
 */
export const mnemonicsNl: Record<string, { hiragana: string; katakana: string }> = {
  a: {
    hiragana: paragraphs(
      'Kijk goed en vind de letter *A* erin.',
      'Er is nog een hiragana die erop lijkt, お, maar daar zit geen *A* in. Zo houd je ze uit elkaar.',
    ),
    katakana:
      'In ア zit een vervormde hoofdletter *A*. Je moet je hoofd een beetje schuin houden en wat lijnen verbinden, maar hij is er echt.',
  },
  i: {
    hiragana: paragraphs(
      'Denk bij deze kana gewoon aan een paar palingen die rondhangen — in het Engels *ee*ls, met een *ie*-klank.',
      'Ze staan rechtop omdat ze de letter i nadoen, die ook rechtop staat en toevallig is hoe je dit teken in romaji schrijft.',
    ),
    katakana:
      'イ lijkt op een adelaar — in het Engels een *ea*gle, met een *ie*-klank — die op de grond staat, of op een tak, of waar dan ook. Zie je zijn poten en zijn rug, gebogen zoals bij een adelaar?',
  },
  u: {
    hiragana: paragraphs(
      'Zie je de *U*-vorm erin?',
      'Er is nog een hiragana die erop lijkt, つ, maar die draagt geen hoedje zoals *U*. Oeh, aah, wat een chique hoed!',
    ),
    katakana: paragraphs(
      'Deze katakana lijkt sterk op zijn hiragana-tegenhanger: う.',
      'Dat lijkt genoeg op elkaar om als ezelsbruggetje te gebruiken.',
    ),
  },
  e: {
    hiragana: paragraphs(
      'Kijk naar deze kana en vind de *e*xotische vogel die er *e*xotische eieren in legt.',
      'De veer op zijn kop verraadt dat hij bijzonder en exotisch is, en de krul lijkt op zijn lijf en staart. Wat schattig!',
    ),
    katakana: paragraphs(
      'Stel je voor dat dit een stalen balk is waarmee een *e*ngineer gebouwen bouwt. Het teken heeft de vorm van het uiteinde van zo’n balk, en het is er ook van gemaakt.',
      'Of zie het als een *e*levator (lift) met de deuren dicht.',
    ),
  },
  o: {
    hiragana: paragraphs(
      'Zie je de letter *o* hier twee keer in? Deze lijkt op あ, met één belangrijk verschil: er zijn twee letters *o* in te zien.',
      'Gebruik dit om deze kana お en de gelijkende あ uit elkaar te houden.',
    ),
    katakana:
      'Deze kana lijkt op een *o*perazanger. Zijn mond heeft de vorm van een o en hij zingt "*Oh*hhh!"',
  },
  ka: {
    hiragana:
      'Zie je hoe deze kana op een mug lijkt? Wat een handig toeval: een mug heet in het Japans か (*ka*)! En als ze je bloed proberen te zuigen, roep je "*ka*p ermee, rotmug!" — dat onthoud je vast makkelijk.',
    katakana:
      'Hij lijkt precies op de hiragana か, alleen mist het extra streepje. Lijkt genoeg om hem makkelijk te onthouden.',
  },
  ki: {
    hiragana: paragraphs(
      'Zie je hoe de vorm van き op een sleutel lijkt — in het Engels een *key*, met een *ki*-klank?',
      'Let op: in sommige lettertypes staat het onderste deel los van de rest. Bijvoorbeeld: {き}. De uitspraak blijft gewoon *ki*!',
    ),
    katakana:
      'Hij lijkt op de hiragana き (in elk geval het bovenste deel) en ook op een stuk van een rare sleutel — in het Engels een *key*.',
  },
  ku: {
    hiragana:
      'Denk bij deze kana aan de snavel van een *koe*koek die uit de klok springt en roept: "*koe* koe, koe koe!"',
    katakana: 'Dit lijkt op een lange *koe*ksmuts. Wat verstoppen ze daaronder?!',
  },
  ke: {
    hiragana: 'Zie je hoe deze kana lijkt op wat wiebelig zeewier — in het Engels *ke*lp?',
    katakana: 'Hij lijkt op de letter *K*!',
  },
  ko: {
    hiragana: paragraphs(
      'こ is een stelletje wormen dat *co*habiteert, deftig voor samenwonen. Ze zijn zo gelukkig samen in hetzelfde holletje!',
      'Je kunt je ook twee korte *ko*ordjes voorstellen die naast elkaar op de grond liggen.',
    ),
    katakana:
      'Zie je de twee hoeken van 90 graden — in het Engels *co*rners? Die twee *co*rners helpen je onthouden dat dit "ko" is.',
  },
  sa: {
    hiragana: paragraphs(
      'Zie je hoe deze kana lijkt op twee handen die in een kom *sa*lsa roeren?',
      'Deze *sa*lsa is zo dik en vol stukjes dat je twee handen nodig hebt om te roeren!',
    ),
    katakana: paragraphs(
      'Kijk naar die twee vissen aan een spies. De kleine is een *sa*rdine en de grote is een *za*lm. Dat zie je aan het verschil in grootte.',
      'Je kunt ook onthouden dat dit *sa* is, omdat vis in het Japans *さ*かな (*sa*kana) heet.',
    ),
  },
  shi: {
    hiragana: paragraphs(
      'Deze kana lijkt op de grote staf van een herder, waarmee hij de schapen bijeendrijft — in het Engels *shee*p, met een *sji*-klank.',
      'Bèèè… de kooi in, *shee*p!',
    ),
    katakana:
      'Deze kana lijkt op een smiley, maar er klopt iets niet. Beide ogen liggen op hun kant en staan boven elkaar, als bij een diepzeevis — in het Engels een deep *sea* fish. *She* (zij) heeft een heel raar gezicht.',
  },
  su: {
    hiragana: paragraphs(
      'Zie je de *s*chommel die over de kop gaat en dat arme kind eraf slingert?',
      'Stel je voor dat hij gilt: "I’M GONNA *SUE* SOMEBODY FOR THIIIIIiiiissss" (Engels voor ‘ik ga hiervoor iemand aanklagen’) terwijl hij in de verte verdwijnt.',
    ),
    katakana: paragraphs(
      'Wat is dat daarboven? Het is *Su*perman die door de lucht loopt!',
      'Wacht — als je beter kijkt, is het alleen zijn lege *su*perpak. …W-Waar is hij in zijn blootje naartoe?',
    ),
  },
  se: {
    hiragana: paragraphs(
      'Deze kana lijkt op een mond met een grote vampiertand erin. Iemand probeert je een *se*t vampiertanden te verkopen, omdat ze gewoon zo *se*xy zijn!',
      'Ach Dracula, altijd op zoek naar een snelle euro.',
    ),
    katakana:
      'Hij lijkt sterk op de hiragana せ, dus die kun je gebruiken om deze kana te onthouden.',
  },
  so: {
    hiragana: 'Zie je hoe deze kana lijkt op een mond die *so*da slurpt?',
    katakana: paragraphs(
      'Het is één naald met een lange draad, waarmee je naait — in het Engels *sew*.',
      'Onthoud: naalden staan altijd rechtop, zoals deze, want je steekt ze recht naar beneden ergens doorheen. Zo houd je deze uit elkaar met de sterk gelijkende ン, de katakana voor "n".',
    ),
  },
  ta: {
    hiragana: paragraphs(
      'Gebruik je fantasie en zie in deze kana een vork, een *ta*co en een schijfje limoen als garnering voor je *ta*co.',
      'Wacht… eet jij een *ta*co met een vork? Een beetje vreemd, maar ieder zijn ding.',
    ),
    katakana:
      'タ lijkt op een vlieger. Een vlieger heet in het Japans *た*こ (*ta*ko). Het is zelfs een *ta*covlieger: hij lijkt precies op een reuzentaco die hoog in de lucht vliegt. Taco’s zijn helemaal in!',
  },
  chi: {
    hiragana:
      'Je weet wel: iemand zegt dat je "*chee*se" moet zeggen als er een foto van je wordt gemaakt. Deze kana lijkt op die geforceerde glimlach die je op elke groepsfoto opzet.',
    katakana:
      'Lijkt dit niet op een *chee*rleader die aan het *chee*ren is? Hopelijk valt ze niet om…',
  },
  tsu: {
    hiragana:
      'Kijk naar de zwaai van deze hiragana. Lijkt het niet op een grote golf, of *tsu*nami?',
    katakana: paragraphs(
      'Waar ソ (so) één naald en draad had, heeft ツ twee naalden en draad.',
      'Onthoud: naalden staan rechtop, want je steekt ze recht naar beneden in de stof. Zo houd je deze uit elkaar met シ (shi), die meer liggende streepjes heeft. Liggende streepjes betekent een gezicht, rechtop betekent naalden. Deze heeft dus twee naalden — in het Engels *two*.',
    ),
  },
  te: {
    hiragana: paragraphs(
      'Zie je een goede ouwe *te*lescoop?',
      'Het is er een die je in je hand houdt! In het Japans is "hand" て (*te*). Dat helpt je onthouden dat deze kana lijkt op een ouderwetse hand(*te*)-*te*lescoop.',
    ),
    katakana: 'Deze kana lijkt op een *te*lefoonpaal.',
  },
  to: {
    hiragana:
      'Deze kana lijkt precies op iemands teen — in het Engels een *toe* — met een spijkertje of splinter erin. Stel je voor hoeveel pijn dat zou doen als het jouw *toe* was!',
    katakana: 'Hij lijkt precies op een *to*tempaal.',
  },
  na: {
    hiragana: paragraphs(
      'De non bidt voor het kruis om *na*cho’s, omdat ze zin heeft in een lekkere snack!',
      'Het kruis in de lucht verraadt meteen dat dit な is.',
    ),
    katakana:
      'Zie je de majestueuze *na*rwal die naar het wateroppervlak zwemt? Wat een prachtig dier.',
  },
  ni: {
    hiragana: 'Zie je de naald die de draad doortrekt — in het Engels een *nee*dle?',
    katakana:
      'Dit zijn twee naalden — in het Engels *nee*dles — die op hun kant liggen. Laat je niet in de war brengen doordat ik zei dat naalden altijd rechtop staan… dat geldt alleen voor de katakana met een schuine lijn (ソ en ツ). Als ze gewoon rusten en nergens mee naaien (geen draad), zijn het twee naalden die op hun kant liggen.',
  },
  nu: {
    hiragana:
      'Deze kana lijkt op wat *noe*dels. Er zijn meer kana die hierop lijken (れ, め, ね, わ), maar je weet dat dit de noedels zijn, want er zitten geen scherpe hoeken in. Hij is 100% glad en buigzaam, net als noedels! Er zit zelfs een extra lusje onderaan, want het is een noedel.',
    katakana: 'De eetstokjes pakken wat *noe*dels en trekken ze uit een kom.',
  },
  ne: {
    hiragana: paragraphs(
      'Dit is *Ne*lly de kat. Er zijn andere kana die hier sterk op lijken (ぬ, れ, め, わ), maar je weet dat deze anders is. Waarom? Omdat er aan het eind een lusje zit voor de staart, en hij is niet superbuigzaam zoals ぬ (noedels) — zie je die scherpe hoeken links?',
      'Als klap op de vuurpijl is *Ne*lly een *ne*cromant. Waarom? Geen idee, dat moet je haar zelf vragen. Het heeft vast iets te maken met het leger ondode katten dat ze aan het opbouwen is.',
      'En als je het woord "*ne*ko" (Japans voor "kat") kent, kun je dat ook gebruiken. Dit is een ねこ.',
    ),
    katakana:
      'Kijk, deze kana lijkt op een paard dat over een horde springt — in het Engels hinnikt het *neigh*! Gok nooit, kinderen!',
  },
  no: {
    hiragana:
      'Zie je de grote varkensneus — in het Engels een *no*se? Je kunt dit ook zien als een "*No* smoking"-bordje (dat met de sigaret en de grote rode cirkel met een streep erdoor). Kies wat het best blijft hangen.',
    katakana: 'Hij lijkt op een heel lange neus — in het Engels een *no*se.',
  },
  ha: {
    hiragana: paragraphs(
      'Deze kana lijkt op een hoofdletter *H* plus een kleine letter *a*.',
      'Wat staat daar? "*Ha*!"',
      'Waarom lach je? Hou op. Zorg dat je de *H+a* in de kana ziet.',
    ),
    katakana:
      'Dit heeft de vorm van zo’n rijstveldhoed — in het Engels een *ha*t. Je moet de stukjes verbinden, maar je ziet het wel, toch?',
  },
  hi: {
    hiragana:
      '*He* has a big nose: hij heeft een grote neus. Zie je die grote neus? Zeg het nu hardop: "*He* has a big nose."',
    katakana: '*Hi*j zegt "*hie*hie." Zie je zijn ondeugende grijns?',
  },
  fu: {
    hiragana:
      'Daar staat iemand te dansen als een gek — in het Engels een *foo*l. Wat heeft die om de nek? …O, een *hoe*lahoep! Daarom draait die zo hard met het lijf.',
    katakana: paragraphs(
      'フ lijkt op een driehoekig vlaggetje. *Hoe*ra voor de driehoeksvlag!',
      'Je moet er zelf een stokje of vlaggenmast bij denken, maar als je die driehoek ziet, weet je dat フ een vlag is die wappert in de wind.',
    ),
  },
  he: {
    hiragana: paragraphs(
      'Ken je de beroemde berg Mount Saint *He*lens? Deze kana is niet helemaal plat zoals Helens, maar wel behoorlijk gedrongen.',
      'Daarom is dit Helens. Als die ooit weer uitbarst, roepen de mensen om *he*lp!',
    ),
    katakana:
      'Deze katakana lijkt precies op de hiragana へ. Ken je de ene, dan ken je ze allebei!',
  },
  ho: {
    hiragana:
      'De lijn links is een schoorsteen. De rechterkant is een gemuteerde kerstman. Hij heeft vier armen, een slangenstaart en geen hoofd. Uit zijn nek klinkt "*ho* *ho* ho… ho ho ho…" Hopelijk komt hij niet door jouw schoorsteen naar beneden.',
    katakana:
      'Dit is een heilig kruis — in het Engels *ho*ly. Je ziet er zelfs heilig licht vanaf komen. Zo *ho*ly.',
  },
  ma: {
    hiragana:
      'Je hoofd eraf halen? Je handen en armen verdubbelen? Wat is dit voor kwade *ma*gie? Wat het nog vreemder maakt: je *ma*ma is degene die deze magie uitvoert. Stel je je *ma* zo voor. Aaah!',
    katakana: 'Kijk al die hoeken! Die lengtes! Die afmetingen! Al die *ma*thematica!',
  },
  mi: {
    hiragana: paragraphs(
      'Lijkt op geluksgetal 21. Wie heeft er net blackjack? *Me*! (Engels voor ‘ik!’) Wie is er ook net 21 geworden? *Me*!!',
      'Luister hoe ik mijn eigen verjaardagslied zing… *mi* mi Mi MIIIIIIII!',
    ),
    katakana: paragraphs('Drie *mi*ssiles die op je af vliegen.', 'Pas op!'),
  },
  mu: {
    hiragana: paragraphs('"*Moe*ooooo," zegt de koe.', '"*MOE*OOOOO."'),
    katakana: paragraphs(
      'Hij heeft de vorm van de vriendelijke kop van een koe.',
      'Kijk die snuit! *Moe*!',
    ),
  },
  me: {
    hiragana: paragraphs(
      'Kijk wat een prachtig oog! Het is zo mooi door de *ma*ke-up. Je ogen moeten er goed uitzien, anders is je hele outfit maar "*meh*."',
      'Als je toevallig het Japanse woord voor "oog" kent, helpt dat ook. Het Japanse woord voor "oog" is gewoon め (*me*).',
    ),
    katakana: paragraphs(
      'Dit lijkt op een "X" over iemands *目 (め)* — "oog" in het Japans.',
      '*Meh*, ik denk dat die er geweest is.',
    ),
  },
  mo: {
    hiragana:
      'Je wilt meer vis vangen — in het Engels *mo*re — dus je doet *mo*re wormen aan je haak.',
    katakana:
      'Deze lijkt sterk op de hiragana も, dus je legt vast makkelijk het verband en onthoudt ze allebei.',
  },
  ya: {
    hiragana: paragraphs(
      'Zie je hoe deze kana lijkt op een *ja*cht met een anker dat naar beneden gaat? Er zit zelfs een vlaggetje achterop… schattig.',
      'Je kunt het ook zien als de kop van een *ja*k!',
    ),
    katakana: 'Deze lijkt precies op de hiragana や, maar dan zonder een klein streepje.',
  },
  yu: {
    hiragana:
      'Deze kana is een heel bijzondere vis — in het Engels *u*nique, uitgesproken als *yu*-niek! Hij lijkt op een grote oogbal die in het water zwemt. Waar kijkt hij naar? Naar *you*, jij grote mafkees! Is het niet raar dat vissen je altijd lijken aan te staren?',
    katakana: '*You* (jij) hebt een haak als hand. Wat ben *you*, een piraat?',
  },
  yo: {
    hiragana:
      '*Yo*, deze kana lijkt op de letters Y en O! En kijk, je kunt er zelfs mee *jo*jo’en. Kijk hoe hij naar beneden glijdt en weer omhoog… betoverend, *yo*.',
    katakana:
      'Zie je hoe deze kana lijkt op iemand die *yo*ga doet? Alleen een *yo*gi kan zich in zo’n hoekige houding buigen.',
  },
  ra: {
    hiragana:
      'ら lijkt op een konijn — in het Engels een *ra*bbit — dat rechtop staat en naar links kijkt. Kijk naar die grote hangoren. Zo schattig!',
    katakana: 'Het is een *ra*ptor met een coole zonnebril, net een *ra*pper.',
  },
  ri: {
    hiragana: paragraphs(
      'Het *ri*et wuift in de wind.',
      'Deze kana wordt ook vaak geschreven zonder de verbinding in het midden, zoals {り}, en lijkt dan nog meer op riet.',
    ),
    katakana: 'Hij lijkt precies op de hiragana り, of in elk geval heel, heel erg.',
  },
  ru: {
    hiragana: paragraphs(
      'Dit is gewoon ろ (die leer je zo meteen) met een lus aan het eind — in het Engels een *loo*p.',
      'る is een gekkere *rou*te. Waarom? Omdat er een *loo*p aan het eind zit.',
    ),
    katakana: 'Je kunt twee *rou*tes nemen: *Rou*te Eén en *Rou*te Twee.',
  },
  re: {
    hiragana: paragraphs(
      'Dit lijkt op een man die op de grond knielt en zijn avondeten eruit gooit — in het Engels *re*tching.',
      'Deze kana lijkt op め, わ, ぬ en ね. Wat deze anders maakt, is de bocht achteraan. Dat zijn de knieën van de man die doorbuigen, en dan is duidelijk dat hij voorovergebogen zijn maag leegt.',
    ),
    katakana: 'Kijk dat prachtige rode haar — in het Engels *re*d — van *Re*i! Het golft zo mooi!',
  },
  ro: {
    hiragana:
      'Dit is de tegenhanger van る, maar deze heeft geen lus aan het eind. Deze kana is dus gewoon een saaie oude weg — in het Engels een *ro*ad.',
    katakana:
      'Deze weg — in het Engels een *ro*ad — gaat eindeloos rond in een vierkant. Wat een vreselijke weg. Wat ben jij, een twaalfjarige die Sim City speelt?',
  },
  wa: {
    hiragana: paragraphs(
      'Deze kana lijkt op een wesp die recht omhoog vliegt — in het Engels een *wa*sp.',
      'Hij lijkt op れ, ぬ, ね en め, en vooral op ね. Je weet dat ね Nelly de kat is, door het krulletje van de staart aan het eind. Stel je dus voor dat de kat deze wesp achternazit, en dat hij daarom recht omhoog vliegt om te ontsnappen. Zijn achterlijf is ook een rechte, scherpe lijn. Dat is zijn angel!',
    ),
    katakana:
      'Deze kana lijkt op een vraagteken. Een vraag begin je vaak met het woord *wa*t. Wat doe je? Wat heb je aan? Wat heb je niet aan?',
  },
  wo: {
    hiragana:
      '"*Wo*ah!" roept de man zonder kin. Iemand heeft een boemerang in zijn mond gegooid! Dat is best een "*wo*ah" waard, vind ik.',
    katakana:
      'Om te onthouden dat ヲ "wo" is, denk je aan een hond die zo hard blaft — in het Engels *woo*f — dat zijn tong eruit vliegt. "*Oh*!" roep je, geschrokken van die hondentong.',
  },
  n: {
    hiragana:
      'Deze kana lijkt precies op een kleine letter *n*. Die klinken toevallig ook hetzelfde. Hoe handig! *nnn* んんん.',
    katakana: paragraphs(
      'Weet je nog dat シ een dame met een raar gezicht is? De twee streepjes liggen meer dan dat ze staan, en daaraan zie je dat het een gezicht is.',
      'En ン dan? Dat is een ma*n* met maar één oog. *Mmn*nnnnn, maar waarom maar één oog, vraag je? Vraag het niet, ik weet het niet.',
    ),
  },
}
