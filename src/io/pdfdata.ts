import { PDFDocument, PDFName, PDFString, PDFHexString } from 'pdf-lib';
import { PDF_KEY } from './data';

/** Aggiunge i dati del diagramma al dizionario Info del PDF. */
export async function embedData(pdf: Uint8Array | ArrayBuffer, data: string, title: string): Promise<Uint8Array> {
  const d = await PDFDocument.load(pdf, { updateMetadata: false });
  d.setTitle(title);
  d.setCreator('ER Studio');
  d.setProducer('ER Studio');
  // getInfoDict è privato nei tipi di pdf-lib ma è l'unico modo per una chiave personalizzata
  (d as any).getInfoDict().set(PDFName.of(PDF_KEY), PDFString.of(data));
  return d.save();
}

/** Legge i dati nascosti; null se il PDF non è stato creato da ER Studio (o è illeggibile). */
export async function readPdfData(pdf: Uint8Array | ArrayBuffer): Promise<string | null> {
  try {
    const d = await PDFDocument.load(pdf, { updateMetadata: false, ignoreEncryption: true });
    const v = (d as any).getInfoDict().lookup(PDFName.of(PDF_KEY));
    if (v instanceof PDFString || v instanceof PDFHexString) return v.decodeText();
    return null;
  } catch {
    return null;
  }
}
