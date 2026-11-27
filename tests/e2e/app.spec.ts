import { test, expect, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { readFileSync } from 'node:fs';

const errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#cv [data-id^="e_"]').first()).toBeVisible();
});
test.afterEach(() => expect(errors).toEqual([]));

const cmd = async (page: Page, menu: string, id: string) => {
  await page.click(`[data-menu="${menu}"]`);
  await page.click(`#menu [data-cmd="${id}"]`);
};
async function exportAs(page: Page, fmt: string) {
  await cmd(page, 'file', 'file.export');
  await page.click(`#exFmt [data-f="${fmt}"]`);
  const dl = page.waitForEvent('download');
  await page.click('#exGo');
  const d = await dl;
  return { name: d.suggestedFilename(), path: (await d.path())! };
}
async function newBlank(page: Page) {
  await cmd(page, 'file', 'file.new');
  await page.click('#newGo');
  await expect(page.locator('#cv [data-id^="e_"]')).toHaveCount(0);
}

test('PDF A4 orizzontale che si riapre', async ({ page }) => {
  const ents = await page.locator('#cv [data-id^="e_"]').count();
  const { name, path } = await exportAs(page, 'pdf');
  expect(name).toBe('Agenzie immobiliari.pdf');
  const pdf = await PDFDocument.load(readFileSync(path));
  expect(pdf.getPageCount()).toBe(1);
  const { width, height } = pdf.getPage(0).getSize();
  expect(Math.round(width)).toBe(842);
  expect(Math.round(height)).toBe(595);

  await newBlank(page);
  await page.setInputFiles('#file', path);
  await expect(page.locator('#toast')).toContainText('riaperto');
  await expect(page.locator('#cv [data-id^="e_"]')).toHaveCount(ents);
  await expect(page.locator('#fileName')).toHaveValue('Agenzie immobiliari');
});

test('un PDF non di ER Studio dà errore', async ({ page }) => {
  const p = await PDFDocument.create();
  p.addPage();
  await page.setInputFiles('#file', { name: 'altro.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await p.save()) });
  await expect(page.locator('#dialog')).toContainText('non è stato creato con ER Studio');
});

test('.json, PNG e SVG', async ({ page }) => {
  const j = await exportAs(page, 'json');
  expect(JSON.parse(readFileSync(j.path, 'utf8')).app).toBe('ER Studio');
  const png = await exportAs(page, 'png');
  expect(readFileSync(png.path).subarray(1, 4).toString()).toBe('PNG');
  const svg = await exportAs(page, 'svg');
  const text = readFileSync(svg.path, 'utf8');
  expect(text).toContain('<svg');
  expect(text).not.toContain('transparent');

  await newBlank(page);
  await page.setInputFiles('#file', j.path);
  await expect(page.locator('#cv [data-id^="e_"]').first()).toBeVisible();
});

test('salvataggio automatico sul dispositivo', async ({ page }) => {
  await newBlank(page);
  await page.waitForTimeout(2300);
  await page.reload();
  await expect(page.locator('#cv [data-id^="e_"]')).toHaveCount(0);
});

test('aggiungi entità, annulla e ripeti', async ({ page }) => {
  const n = await page.locator('#cv [data-id^="e_"]').count();
  await page.click('[data-tool="ent"]');
  await expect(page.locator('#cv [data-id^="e_"]')).toHaveCount(n + 1);
  await page.keyboard.press('Escape');
  await page.click('#cv', { position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+z');
  await expect(page.locator('#cv [data-id^="e_"]')).toHaveCount(n);
  await page.keyboard.press('Control+y');
  await expect(page.locator('#cv [data-id^="e_"]')).toHaveCount(n + 1);
});

test('nessuna installazione né cache offline', async ({ page }) => {
  expect(await page.locator('link[rel="manifest"]').count()).toBe(0);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
});

test('«Sistema tutto» dal tasto destro anche in modalità semplice', async ({ page }) => {
  await page.click('#cv', { button: 'right', position: { x: 20, y: 20 } });
  await expect(page.locator('#menu [data-cmd="edit.arrange"]')).toBeVisible();
  await page.click('#menu [data-cmd="edit.arrange"]');
  await expect(page.locator('#menu')).toBeHidden();
});
