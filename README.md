# ER Studio (Diagramma-ER)

App web per disegnare diagrammi ER in notazione Chen (molteplicità 1/N/M, linea
continua = obbligatoria, tratteggiata = facoltativa) ed esportarli in PDF A4 orizzontale.
Il PDF contiene, nascosti dentro, i dati del diagramma: riaprendolo con **File → Apri**
torni a modificarlo. Le scelte di notazione e interfaccia sono in `RISPOSTE.md`.

## Comandi

```bash
npm install
npm run dev      # sviluppo su http://localhost:5173
npm test         # test unitari (Vitest)
npm run build    # controllo tipi + build in dist/
npm run e2e      # test nel browser (Playwright, dopo la build)
```

## Struttura

- `index.html`, `src/style.css`: interfaccia stile VS Code.
- `src/app.ts`: editor (disegno SVG, disposizione automatica a griglia, comandi, impostazioni).
  Portato dal mockup, ancora da tipizzare man mano.
- `src/io/`: formato dei dati (`data.ts`), dati nascosti nel PDF con pdf-lib (`pdfdata.ts`),
  PDF vettoriale con jsPDF + svg2pdf e PNG (`export.ts`).
- `tests/unit`, `tests/e2e`: test.
- `mockup/er-studio.html`: il mockup a file singolo da cui è partita l'app.

L'app funziona offline (PWA) e salva sul dispositivo. Google Drive si collega più avanti.
Il workflow `.github/workflows/pages.yml` pubblica su GitHub Pages a ogni push su `main`
(serve attivare Pages con sorgente «GitHub Actions» nelle impostazioni del repository).
