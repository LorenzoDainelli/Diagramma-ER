# Risposte raccolte

1. Notazione: Chen con vincoli di cardinalità Chen/Barker espressi come molteplicità.
2. Nome entità: opzione nelle impostazioni (MAIUSCOLO oppure Iniziale maiuscola).
3. Nome associazione: dentro il rombo.
4. Attributi: linea + pallino vuoto = semplice; pallino pieno = PK; quadrato vuoto = composto; doppia freccia = multivalore.
5. Cardinalità: numeri 1 / N / M scritti vicino all'entità.
6. PK composta: la chiave è l'attributo primario dell'entità (si ammette pallino pieno su ogni attributo chiave).
7. Entità deboli / identificatori esterni: non usati.
8. "Molti": N (e M).
9. Posizione molteplicità: a metà linea.
10. Partecipazione opzionale: linea tratteggiata.
12. Attributo composto: quadrato vuoto con lista dei sotto-attributi accanto.
13. Multivalore: doppia freccia + pallino.
11. Cardinalità attributi: non ora, ma abilitabile nelle impostazioni (in futuro).
14. Attributi sulle associazioni: no.
15. Ricorsive: sì; il ruolo si scrive come commento.
16. Solo associazioni binarie (più ricorsive).
17. Generalizzazioni: sì, freccia verso il padre.
18. Copertura: sì, (t,e) (p,s) ecc. accanto alla freccia.
20. Altri simboli: linee tratteggiate o continue; altri verranno comunicati in seguito.
21. Esempi: dovrebbero essere nelle chat di Claude (claude.ai).

## Conoscenze dall'artefatto "Informatica – Diagrammi ER e Query SQL" (claude.ai, 17/11/2026)
Basato sulle soluzioni dei prof (esercizi Multe, Taxi, Agenzie, Corridori):
- Entità = rettangolo, nome al singolare con maiuscola. Associazione = rombo con verbo dentro.
- Molteplicità: il numero (1 / N, N:M con lettere diverse) va vicino all'entità CONTATA.
- Linea continua = partecipazione obbligatoria, tratteggiata = facoltativa; vale per l'entità che la linea tocca.
- Attributi: ● semplice, ■ composto con sotto-attributi fra parentesi "Indirizzo (Via, Città, CAP)", ▲ multiplo, chiave = nome sottolineato, calcolabile = rosso.
- IS-A: freccia a punta piena verso il padre, linea orizzontale che unisce i figli, scritta "totale ed esclusiva" ecc.
- Triangolino dentro il rombo = verso di lettura del verbo (Agente eleva ▼ Infrazione).
- Nei prof compaiono anche attributi sulle associazioni (DataOra su "evasa") e ternarie (M, N, P).
- Errore da evitare: "0/1" sulle linee non si usa: lo 0 si esprime con la linea tratteggiata.

## Conflitti risolti (prevalgono sull'artefatto)
- C1: pallino vuoto = semplice, pallino pieno = chiave (NON sottolineato).
- C2: multivalore = doppia freccia + pallino.
- C3: posizione molteplicità = impostazione: "vicino all'entità contata" oppure "a metà linea".
- C4: triangolino verso di lettura nel rombo e associazioni ternarie: attivabili nelle impostazioni. Niente attributi calcolabili rossi, niente attributi sulle associazioni.
22. (saltata: non rilevante)
24. Colori: bianco e nero oppure soft, scelta in impostazioni.
25. Font: Helvetica/Arial.
26. Dimensione testo: si adatta in automatico.
27. Spessore linee: normale (~1,5 px).
28. Forma linee (impostazione): dritte senza curve / spezzate ad angolo retto / morbide (curve tipo "albero" di Local-AI-Frame-Classifier — da recuperare dal repo).
29. Entità e rombi: si adattano al nome, ma ridimensionabili e spostabili a mano.
31. Nome attributo: trascinabile (posizione automatica iniziale).
32. Griglia con aggancio: sì.
33. Guide di allineamento: sì.
34. Ombre/angoli arrotondati: no (default).
35. Titolo in alto sul foglio: sì.
36. Intestazione (nome, classe, data…): opzionale, attivabile e personalizzabile in impostazioni.
37. Nuova entità: trascinando dalla barra laterale.
38. Nuovo attributo: pulsante su entità selezionata e/o trascinamento — modalità scelta in impostazioni.
39. Posizione attributo: automatica attorno all'entità, poi spostabile.
40. Nuova associazione: "trascina linea A→B con rombo al centro" oppure "seleziona 2 entità + pulsante" — scelta in impostazioni.
41. Molteplicità e partecipazione: click sulla linea → mini-menu (1/N/M, continua/tratteggiata).
42. Rinomina: doppio click.
43. Spostando un'entità gli attributi si spostano con lei.
46. Piegare linee con punti intermedi: no.
47-50. Annulla/Ripeti, Copia/Incolla/Duplica, Selezione multipla, Elimina con Canc: tutti sì.
51. Navigazione: zoom con rotellina/pinch, pan trascinando lo sfondo.
52. Proprietà: pannello a destra.
53. Scorciatoie da tastiera: sì, personalizzabili in impostazioni.
54-55. Allinea/distribuisci selezione + pulsante "sistema tutto" (layout automatico).
56. Bordo pagina A4 visibile: attivabile. Ad ogni modifica il programma ridimensiona tutto per stare nell'A4 (ridimensionamento automatico disattivabile in impostazioni).
57. Diagramma troppo grande: avviso + scelta dell'utente.
58. Avvisi (solo segnalazione, non bloccano): entità senza chiave, molteplicità mancante, nomi duplicati di entità E di associazioni, collegamenti non validi.
60. Commenti: sia testo libero ovunque sia commenti attaccati a un elemento/linea.
61. Più fogli nello stesso file, come le schede di Excel.
62-64. Generare anche: schema logico, SQL CREATE TABLE, dizionario dati.
65. Nuovo diagramma: solo foglio bianco, nessun modello.
61b. PDF con più fogli: finestra per scegliere quali fogli esportare.
62b. Schema logico/SQL/dizionario: si sceglie all'export cosa includere.
66. Margini PDF: 10 mm.
67. PDF vettoriale.
68. Nome file PDF: chiesto ogni volta.
69-70. Dati del diagramma incorporati nel PDF; PDF non creato dall'app → messaggio d'errore.
71. Compatibilità con draw.io: no.
72. Export anche in PNG, SVG e file progetto .json.
73. Salvataggio automatico anche nel browser: sì.
74. Apertura: pulsante, trascinamento file e lista file da Google Drive.
75. Metadati PDF (titolo, autore, data): sì (default).
76. Stampa diretta Ctrl+P: sì.
77. Base tecnica: l'utente chiede un'analisi di cosa è meglio (da presentare).
80. Linguaggio/strumenti: idem, analisi da presentare.
82. PWA offline installabile: sì.
83. Dispositivi: PC con mouse, iPad/tablet con dito/penna, telefono.
