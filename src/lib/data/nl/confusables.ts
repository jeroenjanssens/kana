/** Dutch hints for the confusable sets: set id → kana → hint. */
export const hintsNl: Record<string, Record<string, string>> = {
  'shi-tsu': {
    シ: 'Twee korte streepjes staan verticaal gestapeld links; de lange streep veegt omhoog vanuit linksonder.',
    ツ: 'Twee korte streepjes staan naast elkaar bovenaan; de lange streep valt omlaag vanuit rechtsboven.',
  },
  'so-n': {
    ソ: 'Één kort schuin streepje linksboven; de lange streep buigt omlaag vanuit rechtsboven.',
    ン: 'Één kort bijna-horizontaal streepje linksboven; de lange streep veegt omhoog vanuit linksonder.',
  },
  'shi-n-tsu-so': {
    シ: 'Twee streepjes gestapeld aan de LINKERKANT; hoofdstreep gaat OMHOOG vanuit linksonder.',
    ン: 'Één streepje linksboven (bijna horizontaal); hoofdstreep veegt OMHOOG vanuit rechtsonder.',
    ツ: 'Twee streepjes naast elkaar BOVENAAN; hoofdstreep valt OMLAAG vanuit rechtsboven.',
    ソ: 'Één streepje linksboven (meer schuin); hoofdstreep valt OMLAAG vanuit rechtsboven.',
  },
  'ku-ke-ta': {
    ク: 'Een korte horizontale rechtsboven, dan één streep die haakt van rechtsboven naar linksonder.',
    ケ: 'Drie strepen: een verticale links, een horizontale die kruist bovenaan, en een diagonale naar rechtsonder.',
    タ: 'Twee strepen vormen een hoekige punt bovenaan; een derde streep krult naar rechtsonder met een haakje.',
  },
  'u-wa-fu': {
    ウ: 'Een kort streepje bovenaan; daaronder een brede open U-vorm met platte bodem — als een beker van voren.',
    ワ: 'Een kort streepje linksboven; het lichaam veegt in een brede open boog, de rechterkant krult naar binnen.',
    フ: 'Één horizontale bovenaan met een haak die omlaag en naar links buigt onderaan — als een omgekeerde J.',
  },
  'a-ma': {
    ア: 'Een kort schuin streepje linksboven; een horizontale balk wordt gekruist door een diagonale streep naar linksonder.',
    マ: 'Een horizontale streep bovenaan, dan één streep die naar beneden en naar rechts buigt — geen kruisstreep.',
  },
  'ko-yu': {
    コ: 'Twee horizontale strepen verbonden door een korte verticale rechts — als een vierkant haakje open naar links.',
    ユ: 'Een korte horizontale linksboven, een verticale die ervan afhangt, en een bredere basisstreep — als een J met een bovenkantje.',
  },
  'so-ri': {
    ソ: 'Één kort streepje linksboven; één lange streep buigt omlaag vanuit rechtsboven — asymmetrisch, als een komma.',
    リ: 'Twee aparte verticale strepen naast elkaar; de linker is korter, de rechter langer met een klein haakje onderaan.',
  },
  'na-me': {
    ナ: 'Een horizontale streep gekruist door een verticale recht omlaag vanuit het midden — als een plus zonder linkerarm.',
    メ: 'Twee diagonale strepen die kruisen bij het midden — één van linksboven, één van rechtsboven — een X-vorm.',
  },
  'chi-te': {
    チ: 'Twee korte horizontalen bovenaan; een verticale valt omlaag en buigt naar links onderaan — de basis haakt naar links.',
    テ: 'Twee horizontalen (de onderste langer) verbonden door een korte verticale — als een T met een extra balk erboven.',
  },
  'nu-su': {
    ヌ: 'Een horizontale streep bovenaan; daaronder kruisen twee strepen in een X-patroon — een balk over een kruis.',
    ス: 'Een horizontale streep bovenaan; één streep daalt vanuit het midden en krult naar links onderaan — een balk over een zwiep.',
  },
  'nu-me': {
    ぬ: 'Twee lussen: het linkerlichaam krult in een open naar-buiten-spiraal, en een klein geknoopt lusje zit rechtsboven.',
    め: 'Een meer gesloten ronde buitenlus; de binnenkant spiraliseert strak naar binnen — ronder en meer gesloten dan ぬ.',
  },
  'ne-re-wa': {
    ね: 'Linker verticale met een dwarsbalk; de rechterkant lust rond en sluit in een klein lusje rechtsonder.',
    れ: 'Zoals ね maar rechtsonder sluit het niet — de streep buigt naar buiten en loopt open door zonder lus.',
    わ: 'Geen dwarsbalk op de linkerstreep; de rechterkant buigt en keert terug naar binnen — eenvoudiger dan ね of れ.',
  },
  'ru-ro': {
    る: 'Een streep buigt rond en sluit in een lus onderaan, dan spiraliseert naar binnen — de onderkant is een gesloten lus.',
    ろ: 'Zoals る maar de onderkant sluit niet in een lus — de streep buigt en loopt open naar rechts.',
  },
  'ha-ho': {
    は: 'Linker verticale streep; de rechterkant heeft een dwarsbalk en een dalende lus — twee onderdelen rechts.',
    ほ: 'Zoals は maar met een extra korte horizontale die het rechterdeel bovenaan verbindt — drie onderdelen rechts.',
  },
  'sa-chi': {
    さ: 'Een horizontale bovenaan, een verticale die kruist, dan een lus naar rechts eronder — drie duidelijke strepen.',
    ち: 'Een horizontale buigt omlaag en naar rechts, dan een grote ronde lus veegt naar links eronder — geen kruisende verticale.',
  },
  'ki-sa': {
    き: 'Drie horizontale strepen; de onderste twee zijn rechts verbonden door een gebogen lus — complexer dan さ.',
    さ: 'Één horizontale bovenaan, één kruisende verticale, één rechtse lus — eenvoudiger met minder strepen dan き.',
  },
  'i-ri': {
    い: 'Twee strepen: een korte linker boog die naar binnen krult, en een langere rechterstreep die omlaag buigt en terugzwaait.',
    り: 'Twee strepen: de linker is kort en bijna recht, de rechter hangt langer en haakt scherp naar links onderaan.',
  },
  'ko-ni': {
    こ: 'Twee horizontalen verbonden aan hun rechterkant door een korte verticale — als een vierkant haakje naar links.',
    に: 'Een horizontale bovenaan, een verticale die ervan afvalt, dan een basislijn die verder naar rechts doorloopt — meer strepen dan こ.',
  },
  'a-o-me': {
    あ: 'Een horizontale balk gekruist door een verticale, dan een grote brede lus naar links — de lus opent naar rechts.',
    お: 'Zoals あ maar met een extra korte horizontale streep binnenin de rechteronderhoek van de lus — iets meer gesloten.',
    め: 'Geen horizontale balk bovenaan; de vorm is een strak spiraliserende ovaal — dichter bij een cirkel dan あ of お.',
  },
  'nu-ne': {
    ぬ: 'Rechtsboven zit een geknoopt lusje; het onderlichaam krult in een open naar-buiten-spiraal — het rechterknoop is het verschil.',
    ね: 'Een duidelijke dwarsbalk op de linker verticale; de rechterkant maakt één lus die netjes onderaan sluit — geen knoop rechtsboven.',
  },
  'u-tsu': {
    う: 'Een kort streepje bovenaan; eronder buigt een ronde streep in een open komvorm — het streepje is het verschil.',
    つ: 'Geen streepje bovenaan; één streep veegt in een brede boog van rechtsboven helemaal rond — als een ronde vishaak.',
  },
  'ma-mo': {
    ま: 'Een horizontale gekruist door een verticale bovenaan, dan een ronde lus onderaan — drie nette strepen, geen extra haken.',
    も: 'Zoals ま maar twee kleine haken buigen naar rechts van het verticale lichaam — meer strepen en meer hoekige haken.',
  },
  'ra-chi': {
    ら: 'Een korte horizontale linksboven, dan een streep die omlaag buigt en naar rechts uitloopt — een eenvoudige rechtse staart.',
    ち: 'Een horizontale buigt omlaag en naar rechts, dan een grote lus veegt naar links eronder — de lus gaat links, anders dan ら.',
  },
  'ta-na': {
    た: 'Een kruis linksboven, een diagonale streep naar rechts, en een kleine lus rechtsonder — over het algemeen hoekiger.',
    な: 'Een kruisvorm, dan een brede lus naar rechts met een klein apart streepje hangend in de lusruimte — losser van vorm.',
  },
  he: {
    へ: 'Hiragana — een zachte bergtoppen-streep met een iets rondere boog op de top en een langere linkerhelling.',
    ヘ: 'Katakana — bijna identiek aan へ maar iets hoekiger op de top en met een kortere, rechte linkerkant.',
  },
  ri: {
    り: 'Hiragana — de rechterstreep buigt merkbaar naar links onderaan, waardoor een vloeiende, ronde afwerking ontstaat.',
    リ: 'Katakana — beide strepen zijn rechter en meer verticaal; de rechter eindigt in een scherper, minder gebogen haakje.',
  },
  ka: {
    か: 'Hiragana — een verticale met twee strepen rechts die een gebogen, lus-achtige vorm vormen — ronder en vloeiender.',
    カ: 'Katakana — een diagonale van rechtsboven naar linksonder, gekruist door een korte horizontale — hoekig en eenvoudiger.',
  },
  ki: {
    き: 'Hiragana — drie horizontalen waarbij de onderste twee rechts verbonden zijn door een kleine gebogen lus — vloeiend en complex.',
    キ: 'Katakana — drie horizontalen keurig doormidden gesneden door één verticale — een symmetrisch kruisvorm zonder lussen.',
  },
  se: {
    せ: 'Hiragana — heeft een duidelijke gebogen streep die om de rechterkant van het teken buigt — de boog is het sleutelmerk.',
    セ: 'Katakana — een hoekige haak-achtige vorm zonder bogen; scherper en meer geometrisch dan せ.',
  },
  mo: {
    も: 'Hiragana — een verticale met een kruisende horizontale en twee kleine gebogen haken rechts — golvend en asymmetrisch.',
    モ: 'Katakana — drie nette horizontale strepen met een verticale die de onderste twee verbindt — lijkt op een blokkerige E.',
  },
  ya: {
    や: 'Hiragana — een diagonale streep met een gebogen lus rechts en een klein apart streepje links — over het algemeen rond.',
    ヤ: 'Katakana — een horizontale bovenaan, een verticale vanuit het midden, en een korte diagonale links — hoekig.',
  },
}
