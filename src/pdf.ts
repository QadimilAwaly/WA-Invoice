import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import type { InvoiceItem } from './session.js';

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  shopName?: string;
  shopEmail?: string;
  shopAddress?: string;
  shopPhone?: string;
  paymentInfo?: string;
  themeColor?: string;
}

/**
 * Generates a professional PDF invoice using PDFKit.
 * Returns a Promise that resolves to the outputPath when generation is complete.
 */
export function generateInvoicePdf(data: InvoiceData, outputPath: string): Promise<string> {
  const { promise, resolve, reject } = Promise.withResolvers<string>();

  try {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const shopName = data.shopName || "INVOICE GENERATOR BOT";
    const shopEmail = data.shopEmail || "info@invoicebot.id";
    const shopAddress = data.shopAddress || "Jakarta, Indonesia";
    const shopPhone = data.shopPhone || "-";
    const paymentInfo = data.paymentInfo || "Transfer Bank Mandiri: 123-456-7890 (a/n Invoice Bot)";
    const themeColor = data.themeColor || "#1A365D";

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(outputPath);

    doc.pipe(stream);

    const formatter = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const formatRupiah = (val: number): string => formatter.format(val).replace(/IDR/g, 'Rp').trim();

    // 1. Top Decorative Brand Bar
    doc.rect(0, 0, 595.28, 15).fill(themeColor);

    // 2. Header Area
    // Company details (Left)
    doc.fillColor(themeColor);
    doc.fontSize(16).font('Helvetica-Bold').text(shopName, 50, 40);

    doc.fillColor('#718096');
    doc.fontSize(9).font('Helvetica');
    doc.text(shopAddress, 50, 58);
    doc.text(`No. HP: ${shopPhone}`, 50, 71);
    doc.text(`Email: ${shopEmail}`, 50, 84);
    // Document Title & Meta (Right)
    doc.fillColor(themeColor);
    doc.fontSize(20).font('Helvetica-Bold').text('FAKTUR / INVOICE', 350, 40, { align: 'right', width: 195 });

    doc.fillColor('#4A5568');
    doc.fontSize(9).font('Helvetica');
    doc.text(`No. Invoice: ${data.invoiceNumber}`, 350, 62, { align: 'right', width: 195 });
    doc.text(`Tanggal: ${data.date}`, 350, 75, { align: 'right', width: 195 });

    // Header Divider Line
    doc.moveTo(50, 95).lineTo(545, 95).strokeColor('#E2E8F0').lineWidth(1).stroke();
    // 3. Info Boxes (Customer & Payment Status)
    const clientBoxY = 110;

    // Customer Info Box (Left)
    doc.rect(50, clientBoxY, 280, 48).fill('#F8FAFC');
    doc.rect(50, clientBoxY, 3, 48).fill(themeColor);

    doc.fillColor('#718096');
    doc.fontSize(8).font('Helvetica-Bold').text('KEPADA YTH:', 65, clientBoxY + 8);
    doc.fillColor('#2D3748');
    doc.fontSize(11).font('Helvetica-Bold').text(data.customerName, 65, clientBoxY + 22);

    // Payment Status Box (Right)
    const isLunas = data.balanceDue === 0;
    const statusBg = isLunas ? '#ECFDF5' : '#FEF2F2';
    const statusBorder = isLunas ? '#10B981' : '#EF4444';
    const statusTextCol = isLunas ? '#059669' : '#B91C1C';
    const statusLabel = isLunas ? 'LUNAS' : 'BELUM LUNAS';

    doc.rect(350, clientBoxY, 195, 48).fill(statusBg);
    doc.rect(350, clientBoxY, 3, 48).fill(statusBorder);

    doc.fillColor('#718096');
    doc.fontSize(8).font('Helvetica-Bold').text('STATUS PEMBAYARAN:', 365, clientBoxY + 8);
    doc.fillColor(statusTextCol);
    doc.fontSize(12).font('Helvetica-Bold').text(statusLabel, 365, clientBoxY + 22);
    // 4. Table Section
    const tableHeaderY = 180;
    const headerHeight = 24;
    doc.rect(50, tableHeaderY, 495, headerHeight).fill(themeColor);

    doc.fillColor('#FFFFFF');
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('No.', 50, tableHeaderY + 8, { width: 30, align: 'center' });
    doc.text('Deskripsi Item', 80, tableHeaderY + 8, { width: 250, align: 'left' });
    doc.text('Qty', 330, tableHeaderY + 8, { width: 40, align: 'center' });
    doc.text('Harga Satuan', 370, tableHeaderY + 8, { width: 85, align: 'right' });
    doc.text('Total', 455, tableHeaderY + 8, { width: 90, align: 'right' });

    // Table Items Rows
    let currentY = tableHeaderY + headerHeight;
    const rowHeight = 26;
    doc.font('Helvetica').fontSize(9);

    data.items.forEach((item, index) => {
      // Alternate row backgrounds
      if (index % 2 === 1) {
        doc.rect(50, currentY, 495, rowHeight).fill('#F8FAFC');
      }

      doc.fillColor('#2D3748');
      doc.text((index + 1).toString(), 50, currentY + 9, { width: 30, align: 'center' });
      doc.text(item.name, 80, currentY + 9, { width: 250, align: 'left', ellipsis: true });
      doc.text(item.qty.toString(), 330, currentY + 9, { width: 40, align: 'center' });
      doc.text(formatRupiah(item.price), 370, currentY + 9, { width: 85, align: 'right' });
      doc.text(formatRupiah(item.qty * item.price), 455, currentY + 9, { width: 90, align: 'right' });

      // Row separator line
      doc.moveTo(50, currentY + rowHeight).lineTo(545, currentY + rowHeight).strokeColor('#E2E8F0').lineWidth(0.5).stroke();

      currentY += rowHeight;
    });

    // 5. Summary Totals Section
    const summaryBoxY = currentY + 15;
    const summaryBoxHeight = 105;

    // Draw Totals Box
    doc.rect(320, summaryBoxY, 225, summaryBoxHeight).fill('#F8FAFC');
    doc.rect(320, summaryBoxY, 225, summaryBoxHeight).strokeColor('#E2E8F0').lineWidth(0.5).stroke();

    doc.fontSize(9).font('Helvetica');

    // Subtotal
    doc.fillColor('#718096').text('Subtotal:', 330, summaryBoxY + 8, { width: 100, align: 'right' });
    doc.fillColor('#2D3748').text(formatRupiah(data.subtotal), 435, summaryBoxY + 8, { width: 100, align: 'right' });

    // Discount
    doc.fillColor('#718096').text('Diskon:', 330, summaryBoxY + 22, { width: 100, align: 'right' });
    doc.fillColor('#E53E3E').text(`- ${formatRupiah(data.discountAmount)}`, 435, summaryBoxY + 22, { width: 100, align: 'right' });

    // Tax
    doc.fillColor('#718096').text('Pajak:', 330, summaryBoxY + 36, { width: 100, align: 'right' });
    doc.fillColor('#2D3748').text(formatRupiah(data.taxAmount), 435, summaryBoxY + 36, { width: 100, align: 'right' });

    // Divider Line 1
    doc.moveTo(330, summaryBoxY + 49).lineTo(535, summaryBoxY + 49).strokeColor('#CBD5E0').lineWidth(0.5).stroke();

    // Grand Total
    doc.fillColor(themeColor).font('Helvetica-Bold');
    doc.text('Total Akhir:', 330, summaryBoxY + 54, { width: 100, align: 'right' });
    doc.text(formatRupiah(data.total), 435, summaryBoxY + 54, { width: 100, align: 'right' });

    // Dibayar/DP
    doc.fontSize(9).font('Helvetica');
    doc.fillColor('#718096').text('Dibayar/DP:', 330, summaryBoxY + 68, { width: 100, align: 'right' });
    doc.fillColor('#2D3748').text(formatRupiah(data.paidAmount), 435, summaryBoxY + 68, { width: 100, align: 'right' });

    // Divider Line 2
    doc.moveTo(330, summaryBoxY + 81).lineTo(535, summaryBoxY + 81).strokeColor('#CBD5E0').lineWidth(0.5).stroke();

    // Sisa Tagihan
    const hasBalance = data.balanceDue > 0;
    doc.fillColor(hasBalance ? '#E53E3E' : '#718096').font('Helvetica-Bold');
    doc.text('Sisa Tagihan:', 330, summaryBoxY + 87, { width: 100, align: 'right' });
    doc.text(formatRupiah(data.balanceDue), 435, summaryBoxY + 87, { width: 100, align: 'right' });
    // 6. Professional Footer Area
    const footerY = 705;
    doc.rect(50, footerY, 495, 45).fill('#F8FAFC');
    
    // Draw top highlight border
    doc.rect(50, footerY, 495, 1).fill(themeColor);

    doc.fillColor('#718096').font('Helvetica-Bold').fontSize(8).text('INFORMASI PEMBAYARAN:', 60, footerY + 8);
    doc.fillColor('#4A5568').font('Helvetica').fontSize(8).text(paymentInfo, 60, footerY + 22);
    
    doc.fillColor('#718096').font('Helvetica-Oblique').fontSize(8).text('Terima kasih atas kepercayaan Anda!', 60, footerY + 8, { width: 475, align: 'right' });

    doc.end();

    stream.on('finish', () => {
      resolve(outputPath);
    });

    stream.on('error', (err) => {
      reject(err);
    });
  } catch (err) {
    reject(err);
  }

  return promise;
}
