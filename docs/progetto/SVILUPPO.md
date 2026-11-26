# Sviluppo (solo repository privato)

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # test unitari (Vitest)
npm run build    # build da pubblicare: offuscata, parte solo su lorenzodainelli.github.io
npm run build:test && npm run e2e   # build che parte anche su localhost + test nel browser
```

- `src/app.ts`: editor (disegno SVG, disposizione a griglia, comandi). Portato dal mockup, da tipizzare.
- `src/io/`: formato dati, PDF con dati nascosti (pdf-lib), export PDF/PNG (jsPDF + svg2pdf).
- `scripts/offusca.mjs`: offusca il codice dell'app.
- `SITI` in cima a `src/app.ts`: l'app parte solo da questi domini (se un giorno usi un dominio tuo, aggiungilo).
- Niente PWA: l'app non si installa e non funziona offline, di proposito.
- `docs/progetto/`: domande, risposte (convenzioni di notazione) e il mockup originale.

## Pubblicazione

- `pages.yml`: pubblica su Pages da questo repository finché è pubblico.
- `vetrina.yml`: quando questo repository è privato, copia nel repository pubblico solo
  l'app compilata, README, LICENSE e immagini. Configurazione nei commenti del file.
