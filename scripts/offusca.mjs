// Dopo la build: rende illeggibile il codice dell'app (non le librerie, che sono pubbliche).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import JavaScriptObfuscator from 'javascript-obfuscator';

const dir = 'dist/assets';
const ours = readdirSync(dir).filter(f => /^(index|export|pdfdata)-.*\.js$/.test(f) && !f.startsWith('index.es'));
for (const f of ours) {
  const p = `${dir}/${f}`;
  const src = readFileSync(p, 'utf8');
  // export e pdfdata contengono jsPDF/pdf-lib: lì basta la minificazione, offuschiamo solo l'app
  if (!f.startsWith('index-')) continue;
  const out = JavaScriptObfuscator.obfuscate(src, {
    compact: true,
    target: 'browser',
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    splitStrings: true,
    splitStringsChunkLength: 8,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    selfDefending: false,
    sourceMap: false
  }).getObfuscatedCode();
  writeFileSync(p, out);
  console.log(`offuscato ${f}: ${src.length} → ${out.length} byte`);
}
