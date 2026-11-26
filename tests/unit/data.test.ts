import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { encodeDoc, decodeDoc, docToJson, parseDocJson, type ErDoc } from '../../src/io/data';
import { embedData, readPdfData } from '../../src/io/pdfdata';

const doc: ErDoc = {
  title: 'Città & attività «prova»',
  cur: 1,
  sheets: [{ id: 's1', name: 'Foglio 1', title: 'Schema – àèìòù', m: { ents: [{ id: 'e_1', name: 'Studente', x: 1, y: 2 }], rels: [], links: [], attrs: [], isas: [], notes: [], k: 1, tx: 0, ty: 0 } }]
};

describe('dati del diagramma', () => {
  it('base64 mantiene gli accenti', () => {
    const back = decodeDoc(encodeDoc(doc))!;
    expect(back.title).toBe(doc.title);
    expect(back.sheets[0].title).toBe('Schema – àèìòù');
    expect(back.cur).toBe(0);
  });
  it('json leggibile e controllato', () => {
    expect(parseDocJson(docToJson(doc))!.sheets).toHaveLength(1);
    expect(parseDocJson('{"a":1}')).toBeNull();
    expect(parseDocJson('non json')).toBeNull();
    expect(parseDocJson('{"doc":{"sheets":[{"m":{}}]}}')).toBeNull();
  });
});

describe('PDF', () => {
  it('i dati nascosti sopravvivono al salvataggio', async () => {
    const p = await PDFDocument.create();
    p.addPage([842, 595]);
    const out = await embedData(await p.save(), encodeDoc(doc), doc.title);
    const data = await readPdfData(out);
    expect(decodeDoc(data!)!.sheets[0].m).toEqual(doc.sheets[0].m);
    const again = await PDFDocument.load(out);
    expect(again.getTitle()).toBe(doc.title);
  });
  it('un PDF qualsiasi non contiene un diagramma', async () => {
    const p = await PDFDocument.create();
    p.addPage();
    expect(await readPdfData(await p.save())).toBeNull();
    expect(await readPdfData(new TextEncoder().encode('%PDF-1.4 rotto'))).toBeNull();
  });
});
