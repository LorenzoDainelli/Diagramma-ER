import { jsPDF } from 'jspdf';
import 'svg2pdf.js';
import { embedData } from './pdfdata';

/** A4 orizzontale in mm. */
const A4 = { w: 297, h: 210 };

/** Un SVG per pagina (viewBox del foglio A4) → PDF vettoriale con i dati nascosti dentro. */
export async function exportPdf(svgs: string[], data: string, title: string): Promise<Uint8Array> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  for (let i = 0; i < svgs.length; i++) {
    if (i) pdf.addPage('a4', 'landscape');
    const el = new DOMParser().parseFromString(svgs[i], 'image/svg+xml').documentElement;
    // svg2pdf misura meglio se l'SVG è nel documento
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-99999px;top:0;width:1123px;height:794px;visibility:hidden';
    host.appendChild(el);
    document.body.appendChild(host);
    try {
      await (pdf as any).svg(el, { x: 0, y: 0, width: A4.w, height: A4.h });
    } finally {
      host.remove();
    }
  }
  return embedData(pdf.output('arraybuffer'), data, title);
}

/** SVG → PNG (scala 2 = nitido anche stampato). */
export function svgToPngBlob(svg: string, w: number, h: number, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.round(w * scale);
      c.height = Math.round(h * scale);
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => (b ? resolve(b) : reject(new Error('PNG non creato'))), 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG non valido')); };
    img.src = url;
  });
}
