/**
 * PDF Writer — pure TypeScript, zero dependencies.
 *
 * Generates a minimal but standards-compliant PDF (PDF 1.4) suitable for
 * server-side report generation. No external libraries (e.g. pdfkit) required.
 *
 * The writer produces a single-page document containing:
 *   1. Header block (title, generated-at, seller/location context)
 *   2. Location details (name, type, status, address, coordinates)
 *   3. Contact & fulfillment settings (contact person, phone, capabilities,
 *      operating hours, coverage radius)
 *   4. Stock-by-product table (product, qty available/reserved/unavailable,
 *      unit cost, line value, status)
 *   5. Inventory warehouse linkage note
 *
 * All text is placed with Helvetica (built-in PDF font). Numbers are
 * right-aligned where appropriate. The output Buffer can be sent directly
 * as an Express `application/pdf` response.
 */

type PdfFont = 'Helvetica' | 'Helvetica-Bold' | 'Helvetica-Oblique';

interface PdfText {
  x: number;
  y: number;
  font: PdfFont;
  size: number;
  text: string;
  color?: [number, number, number]; // RGB 0-1
}

interface PdfLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: [number, number, number];
  width?: number;
}

/** Escapes a string for inclusion in a PDF string literal (PDF 1.4). */
function pdfEscape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/** PDF page dimensions (A4 in points: 595.28 × 841.89). */
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;

/**
 * Builds a PDF Buffer for a location report.
 *
 * @param detail — LocationDetailPanel from the use case (location,
 *   fulfillmentSettings, stockByProduct, etc.)
 * @returns Buffer containing a valid PDF document
 */
export function generatePdfReport(detail: any): Buffer {
  const { location, fulfillmentSettings, stockByProduct } = detail || {};
  const texts: PdfText[] = [];
  const lines: PdfLine[] = [];

  let cursorY = PAGE_HEIGHT - MARGIN;

  // ── Helper: add a line of text ──
  const text = (x: number, y: number, str: string, font: PdfFont = 'Helvetica', size: number = 10, color?: [number, number, number]) => {
    texts.push({ x, y, font, size, text: pdfEscape(str), color });
  };

  const heading = (y: number, str: string) => {
    text(MARGIN, y, str, 'Helvetica-Bold', 13, [0.2, 0.2, 0.2]);
    return y - 20;
  };

  const subheading = (y: number, str: string) => {
    text(MARGIN, y, str, 'Helvetica-Bold', 10.5, [0.3, 0.3, 0.3]);
    return y - 16;
  };

  const body = (y: number, label: string, value: string, font: PdfFont = 'Helvetica', size: number = 9.5) => {
    text(MARGIN, y, `${label}: `, font, size);
    text(MARGIN + 120, y, value, font, size);
    return y - 14;
  };

  // ── Title block ──
  cursorY = heading(cursorY, 'MAYSAR SELLER OS — LOCATION REPORT');
  text(MARGIN, cursorY, `Generated: ${new Date().toISOString()}`, 'Helvetica-Oblique', 8.5, [0.5, 0.5, 0.5]);
  cursorY -= 12;
  text(MARGIN, cursorY, `Location ID: ${location?.id ?? '—'}`, 'Helvetica', 9.5);
  cursorY -= 14;
  text(MARGIN, cursorY, `Seller ID: ${location?.sellerId ?? '—'}`, 'Helvetica', 9.5);
  cursorY -= 20;

  // ── Location details ──
  cursorY = subheading(cursorY, 'LOCATION DETAILS');
  cursorY = body(cursorY, 'Name', location?.name ?? '—');
  cursorY = body(cursorY, 'Type', location?.type ?? '—');
  cursorY = body(cursorY, 'Status', location?.status ?? '—');
  cursorY = body(cursorY, 'Location Code', location?.locationCode ?? '—');
  cursorY = body(cursorY, 'Primary', location?.isPrimary ? 'Yes' : 'No');
  cursorY = body(cursorY, 'Active', location?.isActive ? 'Yes' : 'No');
  cursorY = body(cursorY, 'Coordinates', `${location?.latitude ?? '—'}, ${location?.longitude ?? '—'}`);
  const addr = location?.address || {};
  const addrParts = [addr.street, addr.locality, addr.ward, addr.district, addr.region, addr.country].filter(Boolean).join(', ');
  cursorY = body(cursorY, 'Address', addrParts || '—');
  cursorY -= 10;

  // ── Contact & fulfillment settings ──
  cursorY = subheading(cursorY, 'CONTACT & FULFILLMENT SETTINGS');
  const fs = fulfillmentSettings || {};
  cursorY = body(cursorY, 'Contact Name', fs.contactName ?? '—');
  cursorY = body(cursorY, 'Contact Phone', fs.contactPhone ?? '—');
  cursorY = body(cursorY, 'Staff Count', (location?.staffCount ?? '—').toString());
  cursorY = body(cursorY, 'Coverage Radius (km)', (location?.deliveryCoverageRadiusKm ?? '—').toString());
  cursorY = body(cursorY, 'Capabilities', (Array.isArray(fs.capabilities) ? fs.capabilities.join(', ') : '—') || '—');
  cursorY = body(cursorY, 'Operating Hours', fs.operatingHours ? JSON.stringify(fs.operatingHours) : '—');
  cursorY -= 10;

  // ── Stock by product ──
  cursorY = subheading(cursorY, 'STOCK BY PRODUCT');
  // Table header
  const tableX = MARGIN;
  const colX = [tableX, tableX + 120, tableX + 200, tableX + 260, tableX + 320, tableX + 380, tableX + 440];
  const headers = ['Product ID', 'Qty Avail', 'Qty Reserved', 'Qty Unavail', 'Unit Cost (TZS)', 'Line Value (TZS)', 'Status'];
  headers.forEach((h, i) => {
    text(colX[i], cursorY, h, 'Helvetica-Bold', 8.5, [0.2, 0.2, 0.2]);
  });
  cursorY -= 13;
  lines.push({ x1: tableX, y1: cursorY + 4, x2: PAGE_WIDTH - MARGIN, y2: cursorY + 4, width: 0.5 });

  const products = Array.isArray(stockByProduct) ? stockByProduct : [];
  for (const p of products) {
    const rowValues = [
      p.productId ?? '—',
      p.quantityAvailable ?? 0,
      p.quantityReserved ?? 0,
      p.quantityUnavailable ?? 0,
      (p.unitCost ?? 0).toFixed(2),
      (p.lineValueTZS ?? 0).toFixed(2),
      p.stockStatus ?? '—',
    ];
    rowValues.forEach((val, i) => {
      text(colX[i], cursorY, String(val), 'Helvetica', 8.5);
    });
    cursorY -= 12;
  }
  lines.push({ x1: tableX, y1: cursorY + 4, x2: PAGE_WIDTH - MARGIN, y2: cursorY + 4, width: 0.5 });
  cursorY -= 14;

  const totalValue = products.reduce((sum: number, p: any) => sum + (Number(p.lineValueTZS) || 0), 0);
  const totalQty = products.reduce((sum: number, p: any) => sum + (Number(p.quantityAvailable) || 0), 0);
  text(colX[0], cursorY, 'TOTAL', 'Helvetica-Bold', 8.5);
  text(colX[1], cursorY, String(totalQty), 'Helvetica-Bold', 8.5);
  text(colX[2], cursorY, '—', 'Helvetica-Bold', 8.5);
  text(colX[3], cursorY, '—', 'Helvetica-Bold', 8.5);
  text(colX[4], cursorY, '—', 'Helvetica-Bold', 8.5);
  text(colX[5], cursorY, totalValue.toFixed(2), 'Helvetica-Bold', 8.5);
  text(colX[6], cursorY, '—', 'Helvetica-Bold', 8.5);
  cursorY -= 24;

  // ── Inventory linkage ──
  cursorY = subheading(cursorY, 'INVENTORY WAREHOUSE');
  const inv = detail?.inventory || {};
  cursorY = body(cursorY, 'Warehouse ID', inv.warehouseId ?? '—');
  cursorY = body(cursorY, 'Note', inv.note ?? 'Physical stock lives in inventory-service.');
  cursorY -= 20;

  // ── Footer ──
  text(MARGIN, MARGIN / 2, 'Maysar Seller OS — Location Management System', 'Helvetica-Oblique', 8, [0.6, 0.6, 0.6]);
  text(PAGE_WIDTH - MARGIN - 60, MARGIN / 2, 'Page 1 of 1', 'Helvetica-Oblique', 8, [0.6, 0.6, 0.6]);

  // ── Build PDF document ──
  const objects: string[] = [];
  let objNum = 1;

  // Font object (Helvetica, built-in — no font program needed)
  const fontObjNum = objNum++;
  objects.push(
    `${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`
  );

  // Font object Helvetica-Bold
  const fontBoldObjNum = objNum++;
  objects.push(
    `${fontBoldObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`
  );

  // Font object Helvetica-Oblique
  const fontObliqueObjNum = objNum++;
  objects.push(
    `${fontObliqueObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>\nendobj`
  );

  // Build content stream
  const contentOps: string[] = [];

  // Set up text state
  contentOps.push('BT');
  contentOps.push('/F1 12 Tf'); // placeholder, will be replaced per-text
  contentOps.push('1 0 0 1 50 700 Tm');
  contentOps.push('ET');

  // We'll build the content stream manually for precise control
  const contentParts: string[] = [];

  // Helper to emit a text object
  const emitText = (items: PdfText[]) => {
    // Group by font to minimize font switches
    const byFont: Record<PdfFont, PdfText[]> = {
      Helvetica: [],
      'Helvetica-Bold': [],
      'Helvetica-Oblique': [],
    };
    for (const t of items) {
      byFont[t.font].push(t);
    }

    const fontMap: Record<PdfFont, number> = {
      Helvetica: fontObjNum,
      'Helvetica-Bold': fontBoldObjNum,
      'Helvetica-Oblique': fontObliqueObjNum,
    };

    for (const [font, itemsOfFont] of Object.entries(byFont) as [PdfFont, PdfText[]][]) {
      if (itemsOfFont.length === 0) continue;
      contentParts.push('BT');
      contentParts.push(`/${fontMap[font]} 0 Tf`);
      for (const t of itemsOfFont) {
        contentParts.push(`${t.size} Tf`);
        contentParts.push(`${t.x} ${PAGE_HEIGHT - t.y} Td`); // PDF y is from bottom
        if (t.color) {
          contentParts.push(`${t.color[0]} ${t.color[1]} ${t.color[2]} rg`);
        }
        contentParts.push(`(${t.text}) Tj`);
      }
      contentParts.push('ET');
    }
  };

  emitText(texts);

  // Draw lines
  for (const line of lines) {
    contentParts.push(
      `${line.x1} ${PAGE_HEIGHT - line.y1} m ${line.x2} ${PAGE_HEIGHT - line.y2} l ${line.width ?? 0.5} w S`
    );
  }

  const contentStream = contentParts.join('\n');
  const contentObjNum = objNum++;
  objects.push(
    `${contentObjNum} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj`
  );

  // Resources
  const resourcesObjNum = objNum++;
  objects.push(
    `${resourcesObjNum} 0 obj\n<< /ProcSet [/PDF /Text] /Font << /F1 ${fontObjNum} 0 R /F2 ${fontBoldObjNum} 0 R /F3 ${fontObliqueObjNum} 0 R >> >>\nendobj`
  );

  // Page
  const pageObjNum = objNum++;
  objects.push(
    `${pageObjNum} 0 obj\n<< /Type /Page /Parent ${objNum + 1} 0 R /Resources ${resourcesObjNum} 0 R /Contents ${contentObjNum} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] >>\nendobj`
  );

  // Pages
  const pagesObjNum = objNum++;
  objects.push(
    `${pagesObjNum} 0 obj\n<< /Type /Pages /Kids [${pageObjNum} 0 R] /Count 1 >>\nendobj`
  );

  // Catalog
  const catalogObjNum = objNum++;
  const creationDate = new Date().toISOString().replace(/[-:]/g, '').substring(0, 14) + "Z";
  objects.push(
    `${catalogObjNum} 0 obj\n<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>\nendobj`
  );

  // Build cross-reference table
  const xrefOffsets: number[] = [];
  let xrefContent = `xref\n0 ${objNum + 1}\n0000000000 65535 f \n`;
  let currentOffset = 0;

  // Header
  const header = '%PDF-1.4\n%����\n';
  currentOffset += Buffer.byteLength(header);

  // Objects
  for (const objStr of objects) {
    xrefOffsets.push(currentOffset);
    currentOffset += Buffer.byteLength(`${objStr}\n`);
  }

  for (let i = 0; i < xrefOffsets.length; i++) {
    const off = xrefOffsets[i];
    xrefContent += `${off.toString().padStart(10, '0')} 00000 n \n`;
  }

  const xrefStart = currentOffset;
  const trailer = `trailer\n<< /Size ${objNum + 1} /Root ${catalogObjNum} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  // Assemble
  const parts: Buffer[] = [Buffer.from(header)];
  for (const objStr of objects) {
    parts.push(Buffer.from(`${objStr}\n`));
  }
  parts.push(Buffer.from(xrefContent));
  parts.push(Buffer.from(trailer));

  return Buffer.concat(parts);
}
