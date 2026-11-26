# Sviluppo (solo repository privato)

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # test unitari (Vitest)
npm run build    # tipi + build + offuscamento in dist/
npm run e2e      # test nel browser (Playwright, dopo la build)
```

- `src/app.ts`: editor (disegno SVG, disposizione a griglia, comandi). Portato dal mockup, da tipizzare.
- `src/io/`: formato dati, PDF con dati nascosti (pdf-lib), export PDF/PNG (jsPDF + svg2pdf).
- `scripts/offusca.mjs`: offusca il codice dell'app dopo la build.
- `docs/progetto/`: domande, risposte (convenzioni di notazione) e il mockup originale.

## Pubblicazione

- `pages.yml`: pubblica su Pages da questo repository finché è pubblico.
- `vetrina.yml`: quando questo repository è privato, copia nel repository pubblico solo
  l'app compilata, README, LICENSE e immagini. Configurazione nei commenti del file.
