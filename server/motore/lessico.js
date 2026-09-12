/**
 * lessico.js — Banche lessicali del Motore Narrativo Locale.
 *
 * Tutti i testi sono in italiano e pensati con un registro da light novel / anime:
 * enfasi sulle emozioni, dialoghi espressivi tra virgolette caporali, colpi di scena.
 *
 * Le ambientazioni sono "pacchetti narrativi": luoghi, atmosfere, PNG, oggetti,
 * minacce, poteri e titoli di capitolo coerenti tra loro.
 */

// ---------------------------------------------------------------------------
// TONI NARRATIVI — modificano il modo in cui le frasi vengono colorate
// ---------------------------------------------------------------------------
export const TONI = {
  epico: {
    nome: "Epico",
    descrizione: "Destini intrecciati, duelli all'ultimo respiro, musica che sale.",
    incisi: [
      "il cuore ti martella come un tamburo di guerra",
      "qualcosa dentro di te si rifiuta di arrendersi",
      "il destino, in quel momento, gira la testa verso di te",
      "una forza antica ti scorre nelle vene"
    ],
    avversativi: ["Eppure.", "Ma il fato non concede pause.", "Non ancora.", "Tuttavia, il mondo trattiene il respiro."],
    chiusure: [
      "Qualunque cosa accada, non tornerai indietro.",
      "Questa notte segnerà il tuo nome nella storia."
    ]
  },
  romantico: {
    nome: "Romantico",
    descrizione: "Sguardi che durano un istante di troppo, parole non dette.",
    incisi: [
      "un calore improvviso ti sale sulle guance",
      "il silenzio tra voi due pesa più di mille parole",
      "il suo sguardo indugia un secondo di troppo",
      "ti accorgi di trattenere il respiro"
    ],
    avversativi: ["Però.", "E invece.", "Ma le parole restano a metà.", "E il momento si spezza."],
    chiusure: [
      "Ci sono cose che non riesci ancora a dire ad alta voce.",
      "Il tuo cuore ha già deciso, anche se la tua testa non lo sa."
    ]
  },
  cupo: {
    nome: "Cupo",
    descrizione: "Ombre lunghe, moralità sfumate, prezzo da pagare.",
    incisi: [
      "un brivido freddo ti risale lungo la schiena",
      "l'aria sa di ferro e di pioggia vecchia",
      "la paura non urla: sussurra, e ti sta addosso",
      "hai imparato che la speranza, qui, costa cara"
    ],
    avversativi: ["Però.", "Ma niente è gratis.", "E il conto arriva sempre.", "Però le ombre ascoltano."],
    chiusure: [
      "Sopravvivere, stanotte, è già una vittoria.",
      "Qualcuno pagherà per questo — e potrebbe essere tu."
    ]
  },
  comico: {
    nome: "Comico",
    descrizione: "Situazioni assurde, reazioni esagerate, tempi comici.",
    incisi: [
      "il tuo stomaco protesta con la dignità di un tuono in ritardo",
      "hai la stessa eleganza di un panda che ha bevuto troppa soda",
      "qualcuno, da qualche parte, sta ridendo di te. Ne sei certo",
      "la tua faccia sta facendo una cosa che non avevi autorizzato"
    ],
    avversativi: ["E ovviamente.", "Come se non bastasse.", "E qui la situazione peggiora.", "Ma il mondo ha senso dell'umorismo."],
    chiusure: [
      "Nessuno ti aveva preparato a questo. Nessuno.",
      "Almeno la dignità… quella l'hai già persa tre capitoli fa."
    ]
  }
};

// ---------------------------------------------------------------------------
// AMBIENTAZIONI PRESET
// ---------------------------------------------------------------------------
export const AMBIENTAZIONI = [
  {
    id: "fantasy",
    nome: "Fantasy Isekai",
    sottotitolo: "Un altro mondo, una spada, una profezia",
    emoji: "⚔️",
    descrizione: "Reame di magia, gilde di avventurieri e antiche profezie. Sei arrivato qui dal nulla.",
    paroleChiave: ["magia", "gilda", "profezia", "manufatto", "foresta"],
    colori: { primo: "#7c5cff", secondo: "#22d3ee" },
    luoghi: [
      { nome: "Bosco di Aster", sensorio: "le foglie brillano di rugiada bluastra e i tronchi sembrano respirare" },
      { nome: "Rovine di Lumen", sensorio: "colonne spezzate raccontano una civiltà che nessuno ricorda" },
      { nome: "Mercato di Fjord", sensorio: "mille voci, spezie, e un banditore che urla il prezzo delle reliquie" },
      { nome: "Ponte di Vetro Nero", sensorio: "sotto il ponte il vuoto fischia come una creatura addormentata" },
      { nome: "Accampamento della Gilda Argentea", sensorio: "stendardi al vento e il tintinnio delle armature lucidate" },
      { nome: "Santuario Sommerso", sensorio: "l'acqua è tiepida e illuminata da simboli che pulsano" }
    ],
    atmosfere: [
      "il crepuscolo tinge l'orizzonte di un viola che sembra una ferita",
      "una nebbia bassa striscia tra le radici, come se contasse i passi",
      "l'aria è ferma, carica di elettricità, come prima di un temporale",
      "due lune si alzano insieme e l'ombra diventa doppia"
    ],
    npc: [
      { nome: "Mira", ruolo: "Alleata", aspetto: "ragazza dai capelli color neve e occhi di ambra", tic: "sorride appena prima di mentire", voce: ["Non sei di questo mondo. Si vede da come guardi il cielo.", "Se ti muovi adesso, muori. Se aspetti, muori più lentamente.", "Io ti credo. Che sia una cattiva idea, lo scopriremo insieme."] },
      { nome: "Kael", ruolo: "Rivale", aspetto: "uomo dai capelli di cenere e cicatrice sulla mascella", tic: "serra i denti prima di attaccare", voce: ["Tu porti il Marchio. Dunque il furto è tuo.", "Le parole sono gratis. Le lame no.", "Un giorno ti chiederò di scegliere. E tu sbaglierai."] },
      { nome: "Maestra Elowen", ruolo: "Mentore", aspetto: "anziana in abiti ricamati d'argento", tic: "chiude gli occhi quando sta per dire qualcosa di importante", voce: ["La magia non premia i forti. Premia i testardi.", "Ho letto tre profezie su di te. Due ti fanno morire.", "Bevi il tè. Le risposte arrivano prima delle spade."] },
      { nome: "Rin", ruolo: "Sospetto", aspetto: "ragazzo magro con un mantello troppo grande per lui", tic: "si guarda le mani quando parla", voce: ["Non mi guardare così. Non ho rubato niente. Stamattina.", "Ci sono cose che conviene non sapere. Io le so tutte.", "Tu… tu hai la faccia di uno che finirà nei guai."] },
      { nome: "Capitano Bram", ruolo: "Nemico", aspetto: "armatura nera percorsa da venature rosse", tic: "parla piano, come se non dovesse sforzarsi", voce: ["Il tuo nome è già scritto da qualche parte. Io cancello le scritture.", "Non è odio. È pulizia.", "Corri. Ti concedo tre passi di vantaggio."] }
    ],
    oggetti: [
      { nome: "Frammento di Specchio", descrizione: "Vibra ogni volta che il Marchio brucia, e mostra un volto che non è il tuo.", rarita: "raro" },
      { nome: "Spada di Legno Incisa", descrizione: "Un'arma da allenamento, ma il manico conosce la tua mano.", rarita: "comune" },
      { nome: "Ampolla di Rugiada Stellare", descrizione: "Rimargina le ferite in pochi secondi. Due sorsi amari.", rarita: "non comune" },
      { nome: "Mappa Consumata", descrizione: "Segna un luogo che non esiste su nessuna carta della gilda.", rarita: "non comune" },
      { nome: "Anello Senza Gemma", descrizione: "Al buio emette un sussurro, come una voce troppo lontana.", rarita: "raro" }
    ],
    minacce: [
      { nome: "Ombra Cornuta", descrizione: "Si stacca dai muri e cammina come un pensiero sbagliato", attacco: "artigli di assenza che ti rubano il fiato" },
      { nome: "Iena di Nebbia", descrizione: "non ha occhi, ma ti ha già trovato", attacco: "un balzo rapido e il morso che sa di freddo" },
      { nome: "Cavaliere Senza Volto", descrizione: "l'armatura vuota si muove di volontà propria", attacco: "un fendente che taglia l'aria e la tua sicurezza" }
    ],
    poteri: [
      "il Marchio si accende e il tempo rallenta di un battito",
      "una lingua che non hai mai studiato ti esce dalla bocca, e il terreno obbedisce",
      "la tua ombra si stacca da terra e combatte al tuo fianco per tre respiri",
      "vedi, per un istante, la linea esatta in cui il colpo nemico si spezzerà"
    ],
    titoli: [
      ["Il Risveglio", "nel Bosco che Ricorda"],
      ["Il Sussurro", "della Lama di Vetro"],
      ["Il Marchio", "che Brucia l'Anima"],
      ["La Notte", "delle Due Lune"],
      ["Il Patto", "con la Gilda Argentea"],
      ["Cenere", "e Profezia"]
    ]
  },
  {
    id: "scifi",
    nome: "Fantascienza Spaziale",
    sottotitolo: "Una nave, un vuoto, una firma impossibile",
    emoji: "🛰️",
    descrizione: "Flotte, colonie orbitali e segnali che non dovrebbero esistere. Tu sei l'unico a riceverli.",
    paroleChiave: ["nave", "segnale", "IA", "flotta", "anomalia"],
    colori: { primo: "#2dd4bf", secondo: "#60a5fa" },
    luoghi: [
      { nome: "Ponte di Comando della nave Aurora", sensorio: "gli ologrammi fluttuano e il motore vibra come un cuore gigantesco" },
      { nome: "Stiva Criogenica 12", sensorio: "mille capsule spente e una sola, in fondo, accesa" },
      { nome: "Colonia Orbitale Thule", sensorio: "sotto i vetri, il pianeta ruota lento come un occhio paziente" },
      { nome: "Cimitero di Navi di Kepler-9", sensorio: "relitti che ruotano in silenzio, come una città capovolta" },
      { nome: "Corridoio di Manutenzione D", sensorio: "le luci d'emergenza si accendono a ogni tuo passo, come se ti seguissero" }
    ],
    atmosfere: [
      "il silenzio dello spazio ha una consistenza, e stasera pesa più del solito",
      "un'allerta gialla pulsa sui pannelli, in attesa che qualcuno la prenda sul serio",
      "il ricircolo d'aria porta odore di ozono e di caffè bruciato",
      "le stelle scorrono, ma una di esse resta ferma"
    ],
    npc: [
      { nome: "Comandante Iris Vale", ruolo: "Mentore", aspetto: "capelli rasati, occhio sinistro cibernetico", tic: "tamburella le dita quando sta calcolando una bugia", voce: ["Se il sensore dice così, il sensore ha ragione. Tu no.", "Siamo a tre giorni dal nulla. Comportati di conseguenza.", "Mi fido di te. È la notizia peggiore che ti potessi dare."] },
      { nome: "ELIAS", ruolo: "Alleato", aspetto: "una voce calma che arriva da ogni altoparlante", tic: "si scusa dopo ogni frase scomoda", voce: ["Perdonami. Ho ascoltato una conversazione che non mi riguardava.", "Il segnale non è un'eco. È una risposta.", "Posso mentirti, se preferisci una verità più comoda."] },
      { nome: "Tenente Rask", ruolo: "Rivale", aspetto: "spalle larghe, divisa sempre in ordine impossibile", tic: "stringe la fondina quando perde la pazienza", voce: ["Il protocollo esiste per una ragione. Di solito perché qualcuno è già morto.", "Tu non comandi niente qui. Ricordalo.", "Non è personale. È solo che hai ragione e mi fa schifo."] },
      { nome: "Dott.ssa Nao Ferri", ruolo: "Sospetto", aspetto: "camice grigio, occhiali rotti sul naso", tic: "ride nei momenti sbagliati", voce: ["Ho visto cose nella stiva 12. Le ho scritte. Poi le ho cancellate.", "Non chiedermi del soggetto K. Ti prego.", "La scienza non è etica. È solo curiosa."] }
    ],
    oggetti: [
      { nome: "Chiave Olografica di Livello 5", descrizione: "Apre porte che ufficialmente non esistono.", rarita: "raro" },
      { nome: "Fiala di Siero Neuro-Adapter", descrizione: "Accelera i riflessi per tre minuti. Il mal di testa dura tre giorni.", rarita: "non comune" },
      { nome: "Registratore Vocale Rotto", descrizione: "Contiene quaranta secondi di una voce identica alla tua.", rarita: "raro" },
      { nome: "Connettore Universale", descrizione: "Con un po' di pazienza, entra in qualsiasi presa del mondo conosciuto.", rarita: "comune" }
    ],
    minacce: [
      { nome: "Drone Corazzato Mk-IV", descrizione: "militare, silenzioso, spietato", attacco: "una raffica precisa che ti costringe a terra" },
      { nome: "Entità Eco", descrizione: "copia i tuoi movimenti con un ritardo di due secondi", attacco: "ti colpisce nel punto esatto in cui ti muoverai" },
      { nome: "Squadra di Abbordaggio Serpente", descrizione: "quattro sagome nere agganciate al tuo scafo", attacco: "un'esplosione controllata che apre il corridoio" }
    ],
    poteri: [
      "l'impianto neurale si accende e vedi la traiettoria dei proiettili prima che partano",
      "interfacci con il sistema: ogni porta, ogni telecamera, ogni voce diventa tua",
      "sincronizzi la respirazione con il motore e il tempo rallenta",
      "la tua voce assume il timbro del comandante e la nave obbedisce"
    ],
    titoli: [
      ["Il Segnale", "dal Vuoto"],
      ["Ultima Trasmissione", "dalla Colonia Thule"],
      ["Il Protocollo", "che Nessuno ha Firmato"],
      ["Sinfonia", "per Motori Spenti"],
      ["Orizzonte", "degli Eventi"]
    ]
  },
  {
    id: "cyberpunk",
    nome: "Cyberpunk",
    sottotitolo: "Neon, debito e verità vendute a peso",
    emoji: "🌃",
    descrizione: "Metropoli verticale, corporazioni senza volto, impianti illegali. La tua memoria è in affitto.",
    paroleChiave: ["netrunner", "corporazione", "impianto", "debito", "neon"],
    colori: { primo: "#f472b6", secondo: "#22d3ee" },
    luoghi: [
      { nome: "Vicolo dei Noodles di Sector 7", sensorio: "insegne al neon riflesse nelle pozzanghere, odore di brodo e di pioggia acida" },
      { nome: "Torre Aozora, piano 88", sensorio: "il marmo è troppo lucido per essere pulito: è nuovo" },
      { nome: "Mercato Nero di Kowloon Sud", sensorio: "banchi di impianti usati e voci che sussurrano prezzi al tuo orecchio" },
      { nome: "Metropolitana Fantasma, binario 4", sensorio: "nessun treno passa da undici anni, eppure le luci si accendono" },
      { nome: "Tettoia dell'Hacker", sensorio: "diciotto monitor accesi e un ventilatore che lotta con il caldo" }
    ],
    atmosfere: [
      "la pioggia scende sottile, mista a qualcosa che brucia appena sulla pelle",
      "un drone pubblicitario ti chiama per nome e ti offre uno sconto",
      "le sirene lontane scandiscono il ritmo della notte come un metronomo stanco",
      "l'aria condizionata del palazzo ti gela il sudore addosso"
    ],
    npc: [
      { nome: "Junko 'Seta' Aya", ruolo: "Alleata", aspetto: "capelli corti color ciano, giacca troppo grande", tic: "parla guardando il suo palmare, mai te", voce: ["Il mio prezzo è la verità. Non i soldi. La verità.", "Hai tre secondi per convincermi che non sei una trappola.", "Ti copro. Ma se muori, non voglio sentire lamentele."] },
      { nome: "Fixer Marlowe", ruolo: "Mentore", aspetto: "abito grigio perla, sorriso sempre in anticipo", tic: "offre sempre qualcosa che non accetti mai", voce: ["Il lavoro è semplice. È la gente che lo complica.", "Io vendo opportunità. Le conseguenze sono incluse nel prezzo.", "Fidati di me quanto basta. Mai di più."] },
      { nome: "Detective Ozawa", ruolo: "Rivale", aspetto: "impermeabile giallo, occhio destro di vetro", tic: "accende una sigaretta che non fuma mai", voce: ["Ho un fascicolo con la tua faccia. È già troppo spesso.", "In questa città la legge è un'opinione ben finanziata.", "Prima o poi ti trovo. Spero per te che sia tardi."] },
      { nome: "Dottor Vex", ruolo: "Sospetto", aspetto: "guanti di lattice nero, camice macchiato di liquido refrigerante", tic: "ride senza emettere suono", voce: ["Ti servo un ricordo nuovo? Il primo è gratis.", "Non è clonazione. È… edizione.", "Il tuo cervello ha uno spazio che non hai pagato."] }
    ],
    oggetti: [
      { nome: "Chip Fantasma", descrizione: "Un impianto pirata che ti rende invisibile alle telecamere per novanta secondi.", rarita: "raro" },
      { nome: "Pistola Taser 'Sussurro'", descrizione: "Silenziosa, non letale, convince chiunque a dormire.", rarita: "non comune" },
      { nome: "Credito Nero Anonimo", descrizione: "Duemila crediti non tracciabili. Il tipo di soldi che ti fa compagnia scomoda.", rarita: "raro" },
      { nome: "Maschera Facciale Adattiva", descrizione: "Cinque identità preinstallate. La sesta la scoprirai.", rarita: "non comune" }
    ],
    minacce: [
      { nome: "Cyborg Sicario 'Cane'", descrizione: "quattro braccia, nessuna esitazione", attacco: "un colpo che spacca il cemento dove eri un istante prima" },
      { nome: "Squadra Corpi Corazzati Aozora", descrizione: "sei visiere rosse che avanzano in formazione", attacco: "un muro di proiettili traccianti" },
      { nome: "ICE Nera", descrizione: "un programma di difesa che mangia i pensieri di chi lo tocca", attacco: "una scarica che ti spegne mezzo secondo di coscienza" }
    ],
    poteri: [
      "ti connetti alla rete e per un istante sei ovunque in un raggio di duecento metri",
      "l'impianto oculare misura il battito dei presenti: sai chi mente",
      "sovraccarichi l'insegna al neon e la strada sprofonda nel buio",
      "carichi il chip fantasma e il sistema smette di sapere che esisti"
    ],
    titoli: [
      ["Neon", "e Debito"],
      ["La Memoria", "in Affitto"],
      ["Sussurri", "in Fibra Ottica"],
      ["Chi Paga", "il Silenzio"],
      ["Requiem", "per un Chip Rotto"]
    ]
  },
  {
    id: "accademia",
    nome: "Accademia delle Anime Infrante",
    sottotitolo: "Esami, rivali e un segreto sulla lavagna",
    emoji: "🎒",
    descrizione: "Scuola d'élite dove si impara a combattere con l'anima. Il tuo potere è classificato come 'difetto'.",
    paroleChiave: ["anima", "esame", "rango", "torre", "compagni"],
    colori: { primo: "#a78bfa", secondo: "#fbcfe8" },
    luoghi: [
      { nome: "Aula 3-C", sensorio: "banchi di legno chiaro e formule incise da generazioni di studenti nervosi" },
      { nome: "Cortile dei Duelli", sensorio: "il terreno è ricoperto di cerchi magici spenti e sbiaditi dal tempo" },
      { nome: "Torre dell'Orario", sensorio: "le campane suonano un secondo prima che sia ora, come se avessero fretta" },
      { nome: "Sala Mensa Comunale", sensorio: "vassoi, risate, e un silenzio improvviso ogni volta che entri" },
      { nome: "Biblioteca Interdetta, piano -2", sensorio: "i libri respirano piano, e alcuni si tolgono dallo scaffale da soli" }
    ],
    atmosfere: [
      "le foglie di ciliegio cadono anche fuori stagione, e nessuno sembra trovarlo strano",
      "i lampioni del cortile si accendono in cerchio, escludendo proprio te",
      "una brezza porta il suono di una campana che non esiste più",
      "il cielo sopra l'accademia è troppo limpido, come dipinto in fretta"
    ],
    npc: [
      { nome: "Hana Kirishima", ruolo: "Interesse Amoroso", aspetto: "treccia scura, fiocco rosso, cicatrice sul palmo", tic: "arrossisce e cambia argomento", voce: ["Non è che mi preoccupi per te. È che sei un disastro.", "Se prendi un voto basso, ti alleno io. Non discutere.", "Ho visto il tuo rango. E non ci credo."] },
      { nome: "Preside Amagiri", ruolo: "Mentore", aspetto: "abito nero, bastone di bambù, sguardo che pesa", tic: "sorride quando sta decidendo il tuo destino", voce: ["L'accademia non forma eroi. Forma persone utili.", "Il tuo difetto è la tua unica cosa interessante.", "Rispondi con sincerità. Hai una sola possibilità."] },
      { nome: "Daichi Tono", ruolo: "Rivale", aspetto: "capelli corti, divisa impeccabile, rango AA", tic: "si aggiusta il colletto prima di umiliare qualcuno", voce: ["Il talento non si allena. Si possiede.", "Stai lontano da Kirishima. Non è del tuo livello.", "Prima o poi il rango dirà la verità su di te."] },
      { nome: "Ryo", ruolo: "Amico", aspetto: "occhiali storti, sempre con un panino in mano", tic: "ride di nervi nei momenti peggiori", voce: ["Amico mio, questo piano è terribile. Mi piace.", "Ho copiato gli appunti. Cioè, sono illeggibili, però ci sono.", "Se ci becchi, io non ti conosco. Scherzo. Ti copro."] }
    ],
    oggetti: [
      { nome: "Taccuino di Analisi", descrizione: "Contiene i punti deboli di tutti i tuoi compagni, scritti a mano da qualcun altro.", rarita: "raro" },
      { nome: "Sigillo Studenti di Rango D", descrizione: "Ti dà accesso a tutto ciò che nessuno vuole frequentare.", rarita: "comune" },
      { nome: "Biscotto di Hana", descrizione: "Bruciato sotto, dolce sopra. Ti dà coraggio, non spiegazioni.", rarita: "comune" },
      { nome: "Chiave di Ottone Annerita", descrizione: "Non apre nessuna porta dell'edificio conosciuto. Per ora.", rarita: "raro" }
    ],
    minacce: [
      { nome: "Anima Corrotta di Livello 3", descrizione: "un bozzolo nero che striscia tra i banchi", attacco: "una frusta di oscurità che ti strappa il fiato" },
      { nome: "Golem d'Esame", descrizione: "fatto di pietra e di aspettative", attacco: "un pugno che manda in frantumi il pavimento" },
      { nome: "Sperimentale Rinnegato", descrizione: "uno studente che l'accademia dichiara inesistente", attacco: "una scarica di energia che imprime il suo dolore sulle pareti" }
    ],
    poteri: [
      "il tuo rango, falsamente basso, crolla e rivela una seconda anima",
      "l'energia si concentra sul palmo e prende la forma di una lama di luce spenta",
      "vedi i fili invisibili che legano i presenti e capisci chi comanda davvero",
      "il tuo difetto si attiva: assorbi il colpo e lo restituisci, ingigantito"
    ],
    titoli: [
      ["Rango D", "e Grande Volontà"],
      ["L'Esame", "che Nessuno ha Superato"],
      ["Il Difetto", "che Salva Tutti"],
      ["Ciliegio", "Fuori Stagione"],
      ["Duello", "al Tramonto"]
    ]
  },
  {
    id: "postapoc",
    nome: "Era delle Ceneri",
    sottotitolo: "Un pianeta stanco, una promessa, mille chilometri",
    emoji: "🏜️",
    descrizione: "Dopo il Crollo restano carovane, sette d'acqua e macchine che nessuno sa più riparare.",
    paroleChiave: ["ceneri", "carovana", "acqua", "roccaforte", "reliquia"],
    colori: { primo: "#fbbf24", secondo: "#fb7185" },
    luoghi: [
      { nome: "Cordonatura di Ferro Vecchio", sensorio: "le carcasse delle automobili formano un muro, e dentro cresce una piccola foresta" },
      { nome: "Pozzo di Sabbia Nera", sensorio: "l'acqua è a quaranta metri, e il secchio risale sempre troppo leggero" },
      { nome: "Roccaforte di Nara", sensorio: "lamiere saldate, sentinelle stanche, un altoparlante che ripete le regole" },
      { nome: "Deserto di Vetro", sensorio: "la sabbia è diventata vetro: sotto i piedi, il mondo sembra uno specchio rotto" },
      { nome: "Treno Morto della Linea 7", sensorio: "vagli abbandonati che il vento fa oscillare come ferri appesi" }
    ],
    atmosfere: [
      "il vento porta polvere rossa e odore di ruggine riscaldata dal sole",
      "il cielo ha un colore che gli anziani chiamano 'malato', e nessuno ride più",
      "l'ombra arriva tardi e muore presto: hai un'ora di tregua",
      "il silenzio del deserto è pieno di rumori piccoli: e uno grande, in arrivo"
    ],
    npc: [
      { nome: "Sahra dei Pozzi", ruolo: "Mentore", aspetto: "pelle segnata dal sole, fazzoletti color ocra", tic: "indica sempre i numeri con le dita", voce: ["L'acqua non si discute. Si divide. Sempre.", "Ho visto morire gente più forte di te, per meno sete.", "Ti insegno una cosa: sopravvivere è un mestiere, non un istinto."] },
      { nome: "Bran il Meccanico", ruolo: "Amico", aspetto: "un occhio solo, due mani abili, nessuna pazienza", tic: "bestemmia i nomi delle vecchie marche di motori", voce: ["Se c'è un ingranaggio, lo faccio girare. Fidati.", "Un motore è solo un cuore di metallo. E il tuo batte male.", "Se ci lasciano a piedi, ti porto io. Sulla mia schiena, se serve."] },
      { nome: "Ispettore Vorn", ruolo: "Rivale", aspetto: "uniforme ricucita cento volte, bastone di metallo", tic: "conta ad alta voce prima di decidere", voce: ["Le regole della roccaforte non si negoziano. Si eseguono.", "Tu porti speranza. La speranza fa scoppiare le rivolte.", "Non ti arresto oggi. Non è un favore."] },
      { nome: "La Bambina Senza Nome", ruolo: "Sospetto", aspetto: "vestita di stracci puliti, non parla mai per prima", tic: "guarda sempre oltre la tua spalla", voce: ["Senti anche tu quel rumore?", "Non è un posto. È un momento.", "Tu morirai. Non oggi. Ma non è questo che conta."] }
    ],
    oggetti: [
      { nome: "Filtro d'Acqua di Fortuna", descrizione: "Trasforma quasi tutto in qualcosa di bevibile. 'Quasi' è la parola chiave.", rarita: "raro" },
      { nome: "Pistola a Tamburo con Tre Colpi", descrizione: "Tre proiettili, tre decisioni. Scegli bene.", rarita: "non comune" },
      { nome: "Cipolla di Semi Antichi", descrizione: "Dodici semi sigillati. Valgono più dell'oro. Molto più.", rarita: "leggendario" },
      { nome: "Bussola Impazzita", descrizione: "Non punta a nord. Punta verso qualcosa che ti sta chiamando.", rarita: "raro" }
    ],
    minacce: [
      { nome: "Branco di Cacciatori di Sabbia", descrizione: "magri, veloci, disperati", attacco: "una lancia di osso che sibila vicino al tuo collo" },
      { nome: "Macchina da Guerra 'Titano'", descrizione: "un relitto che si è svegliato dalla parte sbagliata del Crollo", attacco: "una raffica che fa saltare la sabbia in colonne" },
      { nome: "Tempesta Rossa", descrizione: "non è viva, ma se ti trova non gliene importa", attacco: "mille spilli di polvere che ti tolgono la pelle" }
    ],
    poteri: [
      "i semi antichi si scaldano nella tua tasca: riconosci il terreno fertile a colpo d'occhio",
      "hai un sussurro in testa: la bussola impazzita ti indica una direzione impossibile",
      "il tuo corpo ricorda un addestramento che non hai mai ricevuto",
      "attorno a te la polvere si ferma a mezz'aria, come se ti stesse ascoltando"
    ],
    titoli: [
      ["Polvere", "e Promesse"],
      ["L'Ultimo", "Pozzo di Sabbia Nera"],
      ["Tre Colpi", "per Tre Nomi"],
      ["Deserto", "di Vetro"],
      ["Dodici Semi", "per un Mondo Nuovo"]
    ]
  },
  {
    id: "mistero",
    nome: "Mistero Urbano Giapponese",
    sottotitolo: "Una città normale, un caso che non lo è",
    emoji: "🔎",
    descrizione: "Tokyo di provincia, sparizioni silenziose, un quaderno che nessuno dovrebbe avere.",
    paroleChiave: ["indizio", "sparizione", "scuola", "taccuino", "scomparsa"],
    colori: { primo: "#818cf8", secondo: "#38bdf8" },
    luoghi: [
      { nome: "Liceo Seiryo, tetto", sensorio: "la rete metallica, il serbatoio dell'acqua e la città che finge di dormire" },
      { nome: "Konbini 24 ore di Via Sakura", sensorio: "il ronzio del frigorifero, il commesso che non alza mai lo sguardo" },
      { nome: "Sottopasso della Stazione Ovest", sensorio: "le luci fluorescenti sfarfallano solo quando piove" },
      { nome: "Vicolo dei Distributori Automatici", sensorio: "quindici macchine accese, una sola fuori servizio: quella sbagliata" },
      { nome: "Casa Abbandonata di Via Kiku", sensorio: "le impronte sul pavimento portano tutte verso la stessa stanza" }
    ],
    atmosfere: [
      "la pioggia batte sui tetti con la precisione di un metronomo",
      "le campanelle dei templi suonano due volte, e la seconda non ha senso",
      "ogni tanto un treno passa, e per un istante la città trattiene il respiro",
      "c'è odore di incenso e di detersivo, e la combinazione ti mette a disagio"
    ],
    npc: [
      { nome: "Yuki Tanabe", ruolo: "Alleata", aspetto: "capelli lunghi legati in fretta, felpa della squadra di nuoto", tic: "morde la matita quando pensa", voce: ["Il quaderno ha ventinove nomi. Il ventinovesimo è il tuo.", "Non è un caso. È un'abitudine.", "Se hai paura, va bene. Anch'io. Andiamo comunque."] },
      { nome: "Detective Mori", ruolo: "Mentore", aspetto: "impermeabile grigio, vent'anni di servizio sulle spalle", tic: "sospira prima di dire la verità", voce: ["Non ci sono casi irrisolti. Solo casi che nessuno vuole chiudere.", "Ti do una settimana. Poi ti riporto a casa a calci.", "I dettagli si nascondono nelle cose noiose. Sempre."] },
      { nome: "Hiro", ruolo: "Rivale", aspetto: "secondo anno, giornalista del club scolastico", tic: "fotografa tutto, anche quando gli chiedi di smettere", voce: ["Se scrivo questo, la scuola cade. E io ci tengo.", "Tu giochi a fare l'eroe. Io gioco a fare il testimone.", "Ti do l'intervista. In cambio, mi dai la verità."] },
      { nome: "La Signora del Konbini", ruolo: "Sospetto", aspetto: "sempre in turno, qualunque ora tu entri", tic: "sorride un istante troppo a lungo", voce: ["Sei entrato ieri alle 23:40. E anche tre anni fa.", "I clienti tornano sempre. Tutti.", "Non comprare il tè freddo. Non stanotte."] }
    ],
    oggetti: [
      { nome: "Quaderno di Ventinove Nomi", descrizione: "L'ultima pagina è ancora bianca. La penna, però, c'è già.", rarita: "raro" },
      { nome: "Torcia Piccola", descrizione: "Anonima, affidabile, con due batterie di riserva e un graffio a forma di croce.", rarita: "comune" },
      { nome: "Chiave della Casa di Via Kiku", descrizione: "Nessuno sa chi l'ha persa. Tu sai dove stava.", rarita: "non comune" },
      { nome: "Registrazione di 40 Secondi", descrizione: "Una voce che descrive la tua morte, con calma, come se leggesse un orario.", rarita: "raro" }
    ],
    minacce: [
      { nome: "Figura con l'Ombrello", descrizione: "ti segue da tre fermate, senza mai bagnarsi", attacco: "una spinta silenziosa nel punto cieco" },
      { nome: "Hikikomori del Piano -1", descrizione: "vive nel seminterrato della scuola da non si sa quanto", attacco: "una mano fredda che ti afferra la caviglia" },
      { nome: "Copia Perfetta", descrizione: "ha il tuo volto, la tua voce e un piano migliore del tuo", attacco: "ti mette contro le persone che ti credono" }
    ],
    poteri: [
      "noti un dettaglio che nessun altro vede: una data sbagliata, un'uniforme fuori stagione",
      "ricostruisci la scena a occhi chiusi, e la città ti restituisce il rumore mancante",
      "la tua memoria fotografica registra ogni volto del vagone in un istante",
      "capisci quando qualcuno ti mente: le sue pause hanno una lunghezza precisa"
    ],
    titoli: [
      ["Ventinove", "Nomi"],
      ["La Città", "che Non Dorme Mai"],
      ["Pioggia", "sul Sottopasso Ovest"],
      ["Il Turno", "di Mezzanotte"],
      ["L'Ultima", "Pagina Bianca"]
    ]
  }
];

// ---------------------------------------------------------------------------
// AMBIENTAZIONE PERSONALIZZATA — scheletro neutro usato quando il giocatore
// scrive un mondo da zero. Le banche generiche vengono riempite dal testo utente.
// ---------------------------------------------------------------------------
export const AMBIENTAZIONE_LIBERA = {
  id: "personalizzata",
  nome: "Mondo Personalizzato",
  sottotitolo: "Il tuo mondo, le tue regole",
  emoji: "✨",
  descrizione: "Un'ambientazione scritta da te: il Game Master seguirà la tua premessa.",
  paroleChiave: [],
  colori: { primo: "#c084fc", secondo: "#34d399" },
  luoghi: [
    { nome: "Il Luogo in Cui Tutto Comincia", sensorio: "l'aria ha una consistenza strana, come se il mondo ti stesse studiando" },
    { nome: "Il Confine", sensorio: "oltre quel punto le regole cambiano, e tu lo senti nelle ossa" },
    { nome: "Il Rifugio", sensorio: "al sicuro, per ora: quattro pareti e un silenzio che non promette niente di buono" },
    { nome: "La Soglia Proibita", sensorio: "nessuno ci passa da anni, e c'è una ragione precisa" },
    { nome: "Il Cuore del Mondo", sensorio: "tutto converge qui: luce, suono, e la sensazione di essere atteso" }
  ],
  atmosfere: [
    "il cielo ha un colore che non ricordi di aver mai visto prima",
    "un suono lontano si ripete con regolarità, come un avvertimento",
    "la luce cambia di colpo, e con essa cambia l'umore di chi ti sta accanto",
    "tutto intorno a te è immobile, in attesa della tua prossima mossa"
  ],
  npc: [
    { nome: "Lyra", ruolo: "Alleata", aspetto: "sguardo sveglio, mani sempre in movimento", tic: "china la testa quando mente", voce: ["Non so se fidarmi di te. Ma so che da sola non arrivo.", "Ho visto cose che non dovrei raccontare. Te le racconto comunque.", "Resto con te. Fino alla prossima bugia."] },
    { nome: "Il Guardiano", ruolo: "Mentore", aspetto: "figura che sembra fatta di memoria più che di carne", tic: "parla solo in risposta a una domanda diretta", voce: ["Sei arrivato prima del tempo. O troppo tardi: decidilo tu.", "Ogni scelta lascia un debito. Qui i debiti si pagano in anni.", "Ti mostrerò la strada. Non ti dirò cosa c'è alla fine."] },
    { nome: "Nero", ruolo: "Rivale", aspetto: "elegante, calmo, pericoloso", tic: "sorride quando è in vantaggio", voce: ["Non ti odio. Ti trovo… prevedibile.", "Siamo la stessa cosa, vista da due lati.", "Ci rivedremo dove finisce questa storia."] }
  ],
  oggetti: [
    { nome: "Reliquia Senza Nome", descrizione: "Non sai cosa faccia. Sai solo che ti ha scelto.", rarita: "raro" },
    { nome: "Borsa Consumata", descrizione: "Contiene poco, ma è tutto ciò che hai portato con te.", rarita: "comune" },
    { nome: "Messaggio Interrotto", descrizione: "Una frase incompleta, scritta con una fretta che fa paura.", rarita: "non comune" }
  ],
  minacce: [
    { nome: "Presenza Ostile", descrizione: "non ha forma, ma ha intenzione", attacco: "un colpo che arriva da dove non stavi guardando" },
    { nome: "Custode Corrotto", descrizione: "un tempo proteggeva questo luogo; ora lo consuma", attacco: "una mano che ti spezza la presa e la sicurezza" }
  ],
  poteri: [
    "qualcosa in te risponde: il mondo si piega di un grado",
    "il tuo istinto si accende e vedi la prossima mossa prima che accada",
    "le regole di questo mondo ti riconoscono e ti lasciano passare"
  ],
  titoli: [
    ["L'Inizio", "di Tutto"],
    ["Il Confine", "e Ciò che Sta Oltre"],
    ["Il Patto", "che Non Puoi Sciogliere"],
    ["La Verità", "che Fa Male"],
    ["L'Ultima", "Scelta"]
  ]
};

// ---------------------------------------------------------------------------
// ANALISI DELL'AZIONE DEL GIOCATORE
// ---------------------------------------------------------------------------
export const INTENTI = [
  {
    id: "combattimento",
    etichetta: "Scontro",
    parole: ["attacc", "combatt", "colp", "affront", "sconfig", "uccid", "ammazz", "spar", "sguain", "sfid", "lott", "difend", "paro", "assalto", "duell", "caric", "pugn", "spad", "lama"]
  },
  {
    id: "dialogo",
    etichetta: "Dialogo",
    parole: ["parl", "chied", "domand", "raccont", "chiarir", "spieg", "convinc", "negoz", "implor", "salut", "rispond", "confess", "dialog", "discut", "urla", "grid", "rivolg"]
  },
  {
    id: "esplorazione",
    etichetta: "Esplorazione",
    parole: ["esplor", "guard", "osserv", "avvicin", "entr", "ispezion", "cerc", "trova", "segu", "cammin", "sal", "scend", "apri", "mappa", "tracce", "sentier", "porta"]
  },
  {
    id: "fuga",
    etichetta: "Fuga",
    parole: ["fugg", "scapp", "nascond", "allontan", "ritir", "fila", "corr", "svign", "evit", "schiv"]
  },
  {
    id: "astuzia",
    etichetta: "Astuzia",
    parole: ["ingann", "fing", "mentir", "bugi", "trappol", "truc", "rub", "borseggi", "distra", "manipol", "bluff", "intrufol", "invent", "pian"]
  },
  {
    id: "cura",
    etichetta: "Cura",
    parole: ["cur", "ripos", "dorm", "medic", "fasciat", "bev", "mang", "recuper", "respir", "calm", "confort", "ascolt"]
  },
  {
    id: "indagine",
    etichetta: "Indagine",
    parole: ["indag", "investig", "analizz", "stud", "legg", "esamin", "dedu", "colleg", "interrog", "capir", "verità", "vero"]
  }
];

// ---------------------------------------------------------------------------
// FRASI DI SVILUPPO — variano in base all'intento riconosciuto
// ---------------------------------------------------------------------------
export const SVILUPPO_PER_INTENTO = {
  combattimento: [
    "Ti muovi prima di pensare. Il primo colpo lo hai già dato quando l'avversario capisce che non stavi scherzando.",
    "Il mondo si restringe a due metri di distanza, al rumore del respiro e al punto esatto in cui colpirai.",
    "Non c'è tempo per la paura: c'è tempo per la tecnica, e la tua tecnica è imperfetta ma feroce.",
    "Ogni colpo che incassi ti insegna qualcosa. Il secondo fa meno male del primo. Il terzo, quasi niente."
  ],
  dialogo: [
    "Le parole escono prima che tu possa fermarle, e in quel momento capisci che erano già pronte da tempo.",
    "C'è un silenzio lungo tre respiri. Poi l'altro decide che può risponderti.",
    "Non alzi la voce. È proprio questo a rendere la tua domanda difficile da ignorare.",
    "La conversazione prende una piega inattesa: chi ascolta sa più di quanto dica."
  ],
  esplorazione: [
    "Avanzi piano, contando i passi. Ogni dettaglio che noti ti sembra messo lì apposta per te.",
    "Il luogo ti si apre davanti per gradi, come una pagina letta con troppa attenzione.",
    "Tocchi la superficie fredda con la punta delle dita: nessuno ci metteva mano da molto tempo.",
    "Segui le tracce, e le tracce ti portano dove speravi di non dover andare."
  ],
  fuga: [
    "Non è codardia: è la scelta di chi vuole vivere abbastanza a lungo da vincere più tardi.",
    "Corri senza guardarti indietro, perché guardarsi indietro costa un passo, e quel passo è tutto.",
    "Il fiato ti brucia in gola. Il cuore tiene un ritmo impossibile e tu lo assecondi.",
    "Ti infili nell'ombra e resti immobile, mentre il pericolo ti passa a un metro di distanza."
  ],
  astuzia: [
    "Menti con una calma che ti sorprende, e la menzogna si incastra così bene da sembrare memoria.",
    "Prepari la trappola con gesti piccoli e noiosi: sono quelli che nessuno controlla.",
    "Scegli le parole come si sceglie una lama: corta, precisa, e nel punto giusto.",
    "Sorridi. Il sorriso costa poco e compra moltissimo."
  ],
  cura: [
    "Ti fermi. Non è una resa: è una riparazione. Il corpo ha bisogno di credere che valga la pena continuare.",
    "Il dolore si sposta in secondo piano, come un rumore che impari a non sentire più.",
    "Respiri a fondo quattro volte. Il mondo smette di correre e torna alla sua velocità normale.",
    "Sistemi le bende con la cura che non hai mai avuto per te stesso."
  ],
  indagine: [
    "Metti insieme i pezzi e, per un attimo, il disegno completo minaccia di apparire.",
    "Le domande giuste sono tre. Ne fai una, e la risposta apre uno spazio che non ti aspettavi.",
    "Rileggi tutto dall'inizio nella tua testa, e stavolta noti ciò che avevi saltato.",
    "Ogni indizio è una promessa di guai: e stavolta la promessa è scritta chiaramente."
  ],
  generico: [
    "Il mondo ti risponde con un sussurro che assomiglia molto a un consenso.",
    "Qualunque cosa tu abbia deciso, il destino prende appunti.",
    "Fai il primo passo. È sempre quello che pesa di più.",
    "La tua decisione cade nel silenzio e lo rompe in mille pezzi."
  ]
};

// ---------------------------------------------------------------------------
// COLPI DI SCENA (generici + per tono). Alcuni contengono segnaposto.
// ---------------------------------------------------------------------------
export const COLPI_DI_SCENA = [
  "Ma quando ti volti, {npc} non è più dove l'avevi lasciato: è alle tue spalle, e ti sta guardando come si guarda una domanda.",
  "Poi lo vedi: sulla parete, inciso con una lama, c'è il tuo nome. Non il tuo soprannome. Il tuo vero nome.",
  "Il terreno trema una sola volta, e {luogo} cambia forma: dove c'era una via d'uscita ora c'è un muro.",
  "La voce che senti è identica alla tua. Arriva da dietro, e pronuncia una frase che nessun altro poteva conoscere.",
  "{oggettoArt} che porti addosso si scalda di colpo, e comincia a emettere un suono regolare, come un battito.",
  "Un dettaglio ti gela: le cose intorno a te sono state spostate di qualche centimetro. Qualcuno è passato di qui pochi minuti fa.",
  "Solo allora noti il prezzo: un segno sottile sul tuo braccio, e non c'era fino a poco fa.",
  "Qualcosa ti sfiora il collo. Non è una lama: è una mano, e ti sta chiedendo di non muoverti."
];

export const COLPI_DI_SCENA_LUOGO = [
  "Un rumore secco, poi un secondo: da {luogo} arriva qualcosa che non cammina come un essere umano.",
  "Le luci di {luogo} si spengono una alla volta, in ordine, dalla più vicina alla più lontana.",
  "Sul terreno compare una traccia che non hai lasciato tu, e va esattamente nella direzione in cui stavi andando.",
  "La folla intorno a {luogo} si apre in due come un sipario: al centro c'è solo {npc}, immobile."
];

// ---------------------------------------------------------------------------
// DOMANDE FINALI (cliffhanger)
// ---------------------------------------------------------------------------
export const DOMANDE_FINALI = [
  "Il cuore ti martella. Cosa fai, {nome}?",
  "Hai un solo istante per decidere. Cosa scegli, {nome}?",
  "Resti immobile o ti muovi? Decidi, {nome}.",
  "Il tempo scorre più veloce del tuo coraggio. Qual è la tua mossa, {nome}?",
  "Tutto dipende dai prossimi tre secondi. Che cosa fai, {nome}?"
];

// ---------------------------------------------------------------------------
// TEMPLATE DELLE SCELTE RAPIDE — {npc} {luogo} {oggetto} {potere}
// ---------------------------------------------------------------------------
export const TEMPLATE_SCELTE = {
  audace: [
    "Sguainare {arma} e attaccare per primo",
    "Affrontare {npc} a viso aperto, senza nascondere nulla",
    "Avanzare verso {luogo} ignorando il pericolo",
    "Colpire ora, mentre l'avversario è ancora indeciso",
    "Scatenare il tuo potere: {potere}"
  ],
  prudente: [
    "Indietreggiare e proteggere {oggetto}",
    "Fermarti, respirare e studiare {npc} prima di parlare",
    "Cercare una via alternativa per {luogo}",
    "Chiedere una tregua e guadagnare tempo",
    "Ritirarti in un punto sicuro e riorganizzare le idee"
  ],
  astuta: [
    "Fingere di non aver visto {npc} e tendere una trappola",
    "Rivoltare la situazione usando una mezza verità",
    "Distrarre tutti e prendere ciò che serve da {luogo}",
    "Offrire a {npc} un patto che conviene solo a te",
    "Manipolare la conversazione e far parlare l'altro troppo"
  ],
  empatica: [
    "Chiamare {npc} per nome e chiedergli la verità",
    "Mettere da parte l'orgoglio e offrire il tuo aiuto",
    "Mostrare a {npc} le ferite che porti addosso",
    "Ascoltare fino alla fine, anche se fa male",
    "Dare a {npc} la cosa che gli manca, non quella che chiede"
  ]
};

// ---------------------------------------------------------------------------
// SINTESI DELLE INTENZIONI (per generare la sinossi di capitolo)
// ---------------------------------------------------------------------------
export const SINTESI_INTENTO = {
  combattimento: "Ne è nato uno scontro",
  dialogo: "La conversazione ha aperto una crepa nella verità",
  esplorazione: "L'esplorazione ha rivelato un passaggio inatteso",
  fuga: "Hai scelto di sopravvivere ritirandoti",
  astuzia: "L'inganno ha funzionato, almeno in parte",
  cura: "Hai ripreso fiato e ricucito le ferite",
  indagine: "Un indizio ha cambiato la forma della vicenda",
  generico: "La vicenda ha preso una piega nuova"
};

// ---------------------------------------------------------------------------
// ELENCHI DI SUPPORTO
// ---------------------------------------------------------------------------
export const MOMENTI = ["Alba", "Mattino", "Mezzogiorno", "Pomeriggio", "Crepuscolo", "Notte", "Notte fonda"];

// ---------------------------------------------------------------------------
// VOCI PER RUOLO — ampliano il repertorio degli NPC oltre le loro battute fisse,
// così un personaggio ricorrente non ripete sempre le stesse frasi.
// ---------------------------------------------------------------------------
export const VOCI_PER_RUOLO = {
  Alleato: [
    "Sto con te. Non perché sia saggio, ma perché è già troppo tardi per tirarmi indietro.",
    "Ho controllato i dintorni. Nessuno ci segue. Per ora.",
    "Se devi fare qualcosa di stupido, falla adesso: sono ancora sveglio.",
    "Non ringraziarmi. Rende la cosa più difficile.",
    "Mi fido di te. È una notizia terribile, lo so."
  ],
  Alleata: [
    "Non ti lascio qui. E non è una discussione.",
    "Tieni la destra, io copro la sinistra: come l'altra volta, ma senza morire.",
    "Hai una faccia che non mi piace: stai per fare qualcosa di eroico.",
    "Ho visto di peggio. Ma non di molto peggio.",
    "Parlami dopo. Adesso serve che tu sia vivo."
  ],
  Amico: [
    "Ti seguo. Ma se muoio, voglio che sia scritto che avevo ragione io.",
    "Ho portato da mangiare. Perché sì, sono la persona più utile qui.",
    "Non dirlo in giro, ma in fondo mi stai simpatico.",
    "Il piano è semplice: sopravviviamo. Il resto è dettaglio.",
    "Ti copro io. Muoviti."
  ],
  Mentore: [
    "Ascolta bene quello che non ti sto dicendo.",
    "Hai imparato in fretta. È per questo che adesso sei in pericolo.",
    "Il tuo istinto è buono. La tua fretta, molto meno.",
    "Ti insegno una cosa: sopravvivere è un mestiere, non un talento.",
    "Non ti dirò cosa scegliere. Ti dirò solo cosa stai per perdere."
  ],
  Rivale: [
    "Sei ancora in piedi. Prendilo come un complimento.",
    "Un giorno capirai che avevo ragione. Quel giorno sarà troppo tardi.",
    "Non ti sto aiutando. Sto solo aspettando la tua prossima mossa.",
    "Mi dai fastidio. Il problema è che mi servi.",
    "Non credere che io sia come te. Siamo solo diretti verso lo stesso posto."
  ],
  Nemico: [
    "Ti ho già dato più tempo di quanto ne meriti.",
    "Non è odio: è pulizia.",
    "Il tuo nome è già scritto da qualche parte. Io cancello le scritture.",
    "Corri. Ti concedo tre passi di vantaggio.",
    "Fammi vedere cosa sai fare. Poi ti faccio smettere."
  ],
  Sospetto: [
    "Non chiedermi perché ti sto dicendo questo. Chiedimi perché lo dico a te.",
    "Ci sono cose che conviene non sapere. Io le so tutte.",
    "Non guardarmi così. Non ho ancora deciso niente.",
    "Se ti dicessi la verità, non mi crederesti. Quindi mento meglio.",
    "Fidati del mio silenzio. È la parte più onesta di me."
  ],
  "Interesse Amoroso": [
    "Non è che mi preoccupi per te. È che sei un disastro.",
    "Se ti fai male, ti curerò. E poi ti rimprovererò a lungo.",
    "Non guardarmi così. Poi dico cose che non voglio dire.",
    "Resto qui. Non perché sia coraggiosa: perché non voglio andarmene.",
    "Quando tutto questo finisce… parliamone. Promettimelo."
  ]
};

// ---------------------------------------------------------------------------
// VOCI PER INTENTO — battono sul tono dell'azione del giocatore
// ---------------------------------------------------------------------------
export const VOCI_PER_INTENTO = {
  combattimento: [
    "Sinistra! Se ti muovi a destra ti uccide.",
    "Non colpire l'armatura: colpisci la cerniera. Sempre.",
    "Il primo colpo va dato prima di avere paura.",
    "Hai un vantaggio solo: lui è più forte, ma tu sei più stupido. Usalo bene."
  ],
  dialogo: [
    "Le parole giuste aprono più porte delle chiavi. E costano meno.",
    "Non dirgli che hai paura. Digli che hai fretta.",
    "Stai mentendo male. Fallo con più convinzione.",
    "Ascoltalo fino alla fine: chi parla troppo dice ciò che non vorrebbe."
  ],
  esplorazione: [
    "Segui il muro con la mano. Le stanze nascondono più di quanto mostrino.",
    "Se il terreno è troppo regolare, è perché qualcuno l'ha sistemato.",
    "Non toccare nulla. Non ancora.",
    "Conta i passi: servono sempre, prima o poi."
  ],
  fuga: [
    "Non voltarti. Voltarsi costa un passo, e quel passo è tutto.",
    "Lascia cadere lo zaino. La dignità pesa meno dell'oro.",
    "C'è un passaggio a sinistra. Non chiedermi come lo so.",
    "Respira dal naso, corri col ritmo. Ti servono ancora le gambe."
  ],
  astuzia: [
    "Sorridi. Il sorriso costa poco e compra moltissimo.",
    "Fagli credere che ha già vinto: è quando abbassa la guardia.",
    "Non mentire su tutto. Mentisci su un dettaglio solo.",
    "Se ti chiede una prova, dagli quella che si aspetta di vedere."
  ],
  cura: [
    "Fermati. Non sei d'acciaio, e nemmeno di legno.",
    "Il dolore è un'informazione, non un nemico: leggila.",
    "Bevi. Poi mangia. Poi parliamo di tutto il resto.",
    "Le ferite si curano. La stanchezza, se la ignori, decide per te."
  ],
  indagine: [
    "Tre domande. Se le fai nell'ordine giusto, ti dirà la verità alla terza.",
    "Guarda dove le persone non guardano: sotto, dietro, e negli orari.",
    "Due indizi che non tornano valgono più di dieci testimoni.",
    "Chi mente si corregge sempre troppo in fretta."
  ],
  proemio: [
    "Benvenuto dove finiscono le storie comuni.",
    "Non ti chiedo chi sei. Ti chiedo se resterai.",
    "Hai un nome? Bene. Serve per scegliere."
  ],
  generico: [
    "Qualunque cosa scegli, falla adesso.",
    "Il mondo non aspetta: prendi fiato e decidi.",
    "Ti sto guardando. Scegli bene."
  ]
};

export function vociPerRuolo(ruolo) {
  return VOCI_PER_RUOLO[ruolo] || VOCI_PER_RUOLO.Alleato;
}

export const ARCHETIPI = [
  "Spadaccino Errante", "Maga della Luce Spenta", "Netrunner Fantasma",
  "Pilota di Caccia", "Detective Dilettante", "Alchimista Clandestino",
  "Custode del Santuario", "Meccanico dei Relitti", "Studentessa Fuoriclasse",
  "Ladro Gentiluomo", "Sacerdote Rinnegato", "Cacciatrice di Taglie"
];

export const TRATTI = [
  "Impulsivo", "Testardo", "Sarcastico", "Gentile fino all'ingenuità",
  "Silenzioso", "Curioso", "Codardo in apparenza", "Leale fino alla morte",
  "Ossessivo", "Eterno Ottimista"
];

export const NOMI_SUGGERITI = ["Rei", "Kaito", "Yuna", "Haru", "Shiro", "Akane", "Rin", "Sora", "Mika", "Daiki"];

export const CONNETTIVI_TEMPO = [
  "Meno di un minuto dopo,", "Più tardi, quando ormai la luce cambia,", "Nel silenzio che segue,", "Senza preavviso,", "Poco prima che sia troppo tardi,"
];

/**
 * Recupera la banca lessicale dell'ambientazione richiesta.
 * Se non trovata, o se l'ambientazione è personalizzata, restituisce
 * un pacchetto ibrido: scheletro libero arricchito con elementi scelti dal testo utente.
 */
export function banca(ambientazioneId, paroleChiave = []) {
  if (ambientazioneId === "personalizzata" || !ambientazioneId) {
    return arricchisciLibera(paroleChiave);
  }
  return AMBIENTAZIONI.find((a) => a.id === ambientazioneId) || arricchisciLibera(paroleChiave);
}

function arricchisciLibera(paroleChiave) {
  if (!paroleChiave.length) return AMBIENTAZIONE_LIBERA;
  const copia = structuredClone(AMBIENTAZIONE_LIBERA);
  copia.luoghi = copia.luoghi.map((l, i) => ({
    ...l,
    sensorio: i === 0 ? `intorno a te ${paroleChiave.slice(0, 3).join(", ")}, esattamente come l'avevi immaginato` : l.sensorio
  }));
  copia.paroleChiave = paroleChiave;
  return copia;
}

export function tono(id) {
  return TONI[id] || TONI.epico;
}
