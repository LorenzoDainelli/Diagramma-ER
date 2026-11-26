# Diagramma ER — Domande prima di partire

Rispondi direttamente sotto ogni domanda (anche solo "sì", "no", "come preferisci", o una lettera). Dove indico un **[default]**, se non rispondi uso quello.

---

## A. Il tuo modo di fare i diagrammi ER (notazione)

1. Che notazione usi? Chen "all'italiana" (Atzeni–Ceri: rettangoli, rombi, pallini) o un'altra (Crow's foot, UML)? **[default: Atzeni–Ceri]**
2. Le **entità** sono rettangoli con il nome dentro? Nome in MAIUSCOLO, Iniziale Maiuscola o come lo scrive l'utente?
3. Le **associazioni** sono rombi? Il nome sta dentro il rombo o accanto?
4. Gli **attributi** sono pallini vuoti collegati da una linea con il nome accanto, oppure ellissi con il nome dentro?
5. Gli **identificatori (chiavi)** sono pallini pieni (neri)? O nome sottolineato?
6. Gli **identificatori composti** (più attributi): li fai con la linea che unisce i pallini e termina con un pallino pieno?
7. Usi **identificatori esterni** (entità debole identificata tramite associazione)? Come li disegni?
8. Le **cardinalità** sono nella forma `(min,max)` es. `(0,N)`, `(1,1)`? Oppure `1:N`, `N:M` sull'associazione?
9. Dove metti le cardinalità: sulla linea, vicino all'entità o vicino al rombo?
10. Usi `N` o `n` o `*` per "molti"?
11. Gli attributi hanno anche cardinalità (es. attributo opzionale `(0,1)`, multivalore `(1,N)`)?
12. Usi **attributi composti** (es. Indirizzo → Via, CAP, Città)? Come li disegni?
13. Usi **attributi derivati**? Con quale simbolo (tratteggiato?)
14. Le associazioni possono avere **attributi propri**? (sì, presumo)
15. Usi associazioni **ricorsive** (entità con se stessa)? Metti i **ruoli** sulle linee?
16. Usi associazioni **ternarie** o n-arie?
17. Usi **generalizzazioni / specializzazioni** (padre/figli)? Con freccia verso il padre?
18. Indichi la copertura delle generalizzazioni `(t,e)`, `(p,s)`, ecc.? Dove la scrivi?
19. Usi i **sottoinsiemi** (generalizzazione con un solo figlio)?
20. Ci sono altri simboli che usi e non ho elencato?
21. Puoi caricare nel repo (o allegarmi) 2–3 esempi di diagrammi ER fatti da te (foto, PDF, PNG, drawio)? È la cosa che mi aiuta di più. Nota: nelle tue repo (Universita, Informatica, ecc.) non ho trovato diagrammi ER, e non ho accesso alle chat precedenti.
22. I diagrammi ER sono per scuola (4ª/5ª informatica, verifiche), per università, o per lavoro?
23. Il prof/corso richiede una notazione precisa? Se sì, quale libro/dispense?

## B. Stile grafico

24. Colori: tutto in bianco e nero (stampabile) o colori (es. entità azzurre, associazioni gialle)? **[default: bianco/nero]**
25. Font preferito? (Arial, Helvetica, Times, quello di draw.io…) **[default: Helvetica/Arial]**
26. Dimensione del testo fissa o modificabile dall'utente?
27. Spessore delle linee: sottile, normale, spesso?
28. Linee dritte, ad angolo retto (ortogonali) o curve? **[default: dritte]**
29. Le entità devono avere dimensione fissa o si allargano col nome?
30. Rombi di dimensione fissa o adattivi al testo?
31. Il nome dell'attributo: a destra del pallino, sopra, o posizionabile liberamente?
32. Vuoi una griglia di sfondo nell'editor? Con aggancio (snap) alla griglia?
33. Vuoi le guide di allineamento automatiche (come draw.io)?
34. Ombre, angoli arrotondati: no, giusto? **[default: no]**
35. Vuoi un titolo del diagramma visibile sul foglio?
36. Vuoi nel foglio anche un'intestazione/piè di pagina (nome, classe, data, materia)?

## C. Funzionalità dell'editor

37. Come si aggiunge un'entità: trascinandola da una barra laterale, con un pulsante, o con doppio click sul foglio?
38. Come si aggiunge un attributo: selezionando l'entità e cliccando "aggiungi attributo", oppure trascinando un pallino sopra l'entità?
39. Quando aggiungo un attributo, deve posizionarsi automaticamente attorno all'entità?
40. Come si crea un'associazione tra due entità: selezionando le due entità e premendo un pulsante, o trascinando una linea da un'entità all'altra con il rombo che compare al centro?
41. Le cardinalità vanno inserite da un menu a tendina (`(0,1)`, `(0,N)`, `(1,1)`, `(1,N)`) o scritte a mano libera? **[default: tendina + testo libero]**
42. Rinomina: doppio click sul testo?
43. Spostando un'entità, i suoi attributi si spostano con lei? **[default: sì]**
44. Spostando un'entità, le linee delle associazioni si aggiornano da sole (sì, ovviamente)?
45. Vuoi poter spostare a mano i pallini degli attributi uno per uno?
46. Vuoi poter piegare le linee (punti intermedi)?
47. Annulla/Ripeti (Ctrl+Z / Ctrl+Y)? **[default: sì]**
48. Copia/incolla/duplica elementi?
49. Selezione multipla (rettangolo di selezione, Shift+click)?
50. Eliminazione con Canc/Backspace?
51. Zoom con rotellina / pinch e pan trascinando lo sfondo?
52. Pannello proprietà a destra (come draw.io) o menu contestuale col tasto destro, o entrambi?
53. Scorciatoie da tastiera specifiche che vorresti (es. E = entità, A = associazione)?
54. Allineamento/distribuzione automatica di elementi selezionati?
55. Vuoi un **layout automatico** ("sistema il diagramma")? O tutto manuale?
56. Il foglio deve essere visibile come pagina **A4 orizzontale** già in fase di disegno (così sai cosa entra nel PDF)? **[default: sì]**
57. Se il diagramma non entra in un A4: scalare per farlo entrare, o permettere più pagine? **[default: scala per entrare in una pagina]**
58. Validazione: vuoi avvisi tipo "entità senza identificatore", "associazione senza cardinalità", "nomi duplicati"?
59. Vuoi un controllo che impedisca di collegare due entità senza associazione o due associazioni tra loro?
60. Note/commenti testuali liberi sul foglio?
61. Più diagrammi nello stesso file (pagine/schede) o un solo diagramma alla volta? **[default: uno]**
62. Vuoi anche lo **schema logico/relazionale** generato dall'ER (es. `STUDENTE(Matricola, Nome, …)`)? Ora o in futuro?
63. Vuoi anche la **generazione SQL** (`CREATE TABLE`)? Ora o mai?
64. Vuoi un dizionario dei dati (tabella entità/attributi/descrizione)?
65. Template/esempi pronti da cui partire (es. Scuola, Biblioteca, Ospedale)?

## D. Export PDF e reimport

66. PDF A4 orizzontale: confermato. Margini? **[default: 10 mm]**
67. Il PDF deve contenere il disegno **vettoriale** (testo selezionabile, nitido) o va bene un'immagine? **[default: vettoriale]**
68. Nome del file PDF: chiesto all'utente, preso dal titolo del diagramma, o con data? 
69. Per ridare il disegno dal PDF, l'idea è **incorporare i dati del diagramma dentro il PDF** (come fa draw.io). Va bene così? (Leggere un PDF qualsiasi disegnato a mano o con altri programmi non è realisticamente fattibile.)
70. Se si carica un PDF che **non** è stato creato dall'app, cosa deve succedere? Messaggio d'errore? **[default: messaggio chiaro]**
71. Il PDF deve restare compatibile con draw.io (cioè aprirlo anche su draw.io desktop/app.diagrams.net)? Utile o indifferente?
72. Oltre al PDF vuoi export in PNG, SVG, o un file `.drawio`/`.json`?
73. Vuoi anche **salvataggio automatico** nel browser (se chiudi la pagina ritrovi il lavoro)? **[default: sì, localStorage]**
74. Caricamento PDF: tramite pulsante "Apri" o anche trascinando il file sulla pagina?
75. Nel PDF: data di creazione, autore, titolo nei metadati?
76. Vuoi la stampa diretta (Ctrl+P) oltre al PDF?

## E. Base tecnica: draw.io

77. draw.io (jgraph/drawio) è enorme (centinaia di MB, migliaia di file, codice legacy). Due strade:
    - **(a)** fork di draw.io e "sfoltirlo" nascondendo menu/forme e aggiungendo una libreria ER su misura — veloce da ottenere, ma l'app resta pesante e complessa da modificare;
    - **(b)** app nuova e leggera che usa **mxGraph/maxGraph** (il motore grafico di draw.io) con solo i tuoi strumenti — più pulita e semplice da mantenere.
    
    Io consiglio **(b)**. Quale preferisci?
78. Se scegli (a): vuoi mantenere l'aspetto (UI) di draw.io o rifarla più semplice?
79. Licenza: draw.io è Apache 2.0 e il tuo repo ha già una LICENSE. Ok tenere Apache 2.0 / quella attuale?
80. Framework: JavaScript puro, oppure React/Vue/Svelte? TypeScript o JavaScript? **[default: TypeScript + Vite, senza framework pesanti]**
81. Hai preferenze/nozioni tue di linguaggi che vuoi poter leggere e modificare in futuro? (Vedo molto Java nelle tue repo.)
82. Deve funzionare **offline** (PWA installabile)?
83. Deve funzionare bene su **tablet/iPad** con il dito o la penna? E sul telefono?
84. Quali browser usi principalmente (Chrome, Safari, Edge, Firefox)?
85. Vuoi anche una versione desktop (Electron) o solo web?

## F. Hosting e distribuzione

86. Dove la pubblichiamo: **GitHub Pages** del repo Diagramma-ER (gratis, `lorenzodainelli.github.io/Diagramma-ER`)? **[default: sì]**
87. Serve un backend/server o tutto nel browser? **[default: tutto nel browser, niente server]**
88. Login/account utenti: servono? **[default: no]**
89. Salvataggio in cloud (Google Drive, ecc.) o solo file locali?
90. Condivisione via link del diagramma?
91. Collaborazione in tempo reale tra più persone: serve? **[default: no]**
92. Chi la userà: solo tu, i tuoi compagni, i tuoi studenti del mentoring, chiunque?

## G. Lingua e interfaccia

93. Interfaccia solo in italiano o anche inglese? **[default: solo italiano]**
94. Nome dell'app: "Diagramma ER" o un altro?
95. Tema chiaro/scuro?
96. Vuoi un piccolo tutorial/guida iniziale o una pagina "Aiuto" con la notazione?
97. Logo/icona: hai idee? Colori preferiti per l'interfaccia?
98. Barra strumenti in alto, a sinistra, o entrambe?
99. Deve essere minimal (pochissimi pulsanti) o con tutte le opzioni visibili?

## H. Casi limite e regole

100. Nomi duplicati di entità: vietati o permessi?
101. Nomi con spazi o accenti: permessi? Convertiti (es. `Data Nascita` → `DataNascita`)?
102. Un attributo può appartenere sia a un'entità sia a un'associazione — confermato che serve su entrambe?
103. Quante entità circa ha un tuo diagramma tipico? (5, 15, 40?) Serve per capire quanto deve "starci" in un A4.
104. Le linee si possono incrociare o vuoi che l'app cerchi di evitarlo?
105. Due associazioni diverse tra le stesse due entità: devono essere ben separate automaticamente?
106. Attributo identificatore su un'associazione: lo vieti/segnali?
107. Cardinalità mancante: la lasci vuota nel PDF o la segnali in rosso solo nell'editor?

## I. Processo di lavoro

108. Prima di scrivere codice vuoi un **mockup** dell'interfaccia da approvare?
109. Preferisci che io consegni una prima versione minima (entità, attributi, associazioni, cardinalità, PDF in/out) e poi aggiungiamo il resto, oppure tutto in una volta? **[default: MVP prima]**
110. Vuoi che apra una Pull Request da rivedere a ogni passo, o lavoro sul branch e ti avviso alla fine?
111. Vuoi test automatici (es. export→import del PDF che ridà lo stesso diagramma)?
112. Scadenza: ti serve per una data precisa (verifica, esame)?
113. C'è qualcosa che **odi** di draw.io o di altri programmi ER che devo assolutamente evitare?
114. C'è qualcosa che **ami** di draw.io che devo assolutamente tenere?

## J. Salvataggio automatico su Google Drive

115. Salvataggio automatico su Drive: ogni quanto? Dopo ogni modifica con un piccolo ritardo (es. 2 s dopo che smetti di modificare) o a intervalli fissi? **[default: 2 s dopo l'ultima modifica]**
116. Cosa salviamo su Drive: il PDF (che si può riaprire nell'app), un file dati (`.json`/`.drawio`), o entrambi? **[default: il PDF, così Drive contiene direttamente il documento finale]**
117. In quale cartella di Drive? Una cartella fissa "Diagramma ER" creata dall'app, o la sceglie l'utente?
118. Accesso a Drive limitato **solo ai file creati dall'app** (permesso `drive.file`, più sicuro e senza revisione Google) va bene? **[default: sì]**
119. Vuoi una lista dei diagrammi salvati su Drive da riaprire dall'app (tipo "I miei diagrammi")?
120. Senza login Google l'app deve funzionare lo stesso (solo salvataggio locale + PDF)? **[default: sì]**
121. Offline: modifiche salvate in locale e sincronizzate su Drive al ritorno della connessione?
122. Vuoi la cronologia delle versioni (Drive la tiene già per ogni file) visibile nell'app?
123. Hai un account Google Cloud? Serve creare un progetto e un "Client ID OAuth" (gratis, ~10 minuti): lo fai tu con una mia guida passo-passo, o preferisci che ti prepari tutto e tu incolli solo l'ID?
