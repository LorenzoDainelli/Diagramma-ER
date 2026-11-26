/** Formato dei dati salvati dentro PDF e .json di ER Studio. */
export const APP_ID = 'ER Studio';
export const FORMAT_VERSION = 1;
export const PDF_KEY = 'ERStudioData';

export interface Sheet { id: string; name: string; title: string; m: unknown }
export interface ErDoc { title: string; cur: number; sheets: Sheet[] }

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** JSON leggibile per il file .json. */
export function docToJson(doc: ErDoc): string {
  return JSON.stringify({ app: APP_ID, versione: FORMAT_VERSION, doc }, null, 1);
}

/** Controlla e restituisce il documento, o null se il contenuto non è di ER Studio. */
export function parseDocJson(text: string): ErDoc | null {
  try {
    const d = JSON.parse(text);
    const doc = d && d.doc;
    if (!doc || !Array.isArray(doc.sheets) || !doc.sheets.length) return null;
    if (!doc.sheets.every((s: any) => s && s.m && Array.isArray(s.m.ents) && Array.isArray(s.m.rels))) return null;
    doc.cur = 0;
    if (typeof doc.title !== 'string') doc.title = 'Diagramma';
    return doc as ErDoc;
  } catch {
    return null;
  }
}

/** Dati compatti (base64 di JSON UTF-8) da nascondere nel PDF. */
export function encodeDoc(doc: ErDoc): string {
  return toBase64(new TextEncoder().encode(JSON.stringify({ app: APP_ID, versione: FORMAT_VERSION, doc })));
}
export function decodeDoc(b64: string): ErDoc | null {
  try {
    return parseDocJson(new TextDecoder().decode(fromBase64(b64.trim())));
  } catch {
    return null;
  }
}
