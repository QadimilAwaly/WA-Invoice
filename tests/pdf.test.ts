import { generateInvoicePdf, type InvoiceData } from '../src/pdf.js';
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log("Running generateInvoicePdf tests...");

  const data: InvoiceData = {
    invoiceNumber: "INV-20260625-9999",
    date: "2026-06-25",
    customerName: "Toko Kelontong Sejahtera",
    items: [
      { name: "Kopi Susu Gula Aren", qty: 5, price: 18000 },
      { name: "Roti Bakar Cokelat", qty: 2, price: 25000 },
      { name: "Air Mineral 600ml", qty: 10, price: 4000 }
    ],
    subtotal: 180000,
    discountAmount: 18000,
    taxAmount: 17820,
    total: 179820,
    paidAmount: 100000,
    balanceDue: 79820,
    shopAddress: "Jl. Merdeka No. 45, Jakarta",
    shopPhone: "0812-3456-7890"
  };

  const outputPath = path.join("invoices", `${data.invoiceNumber}.pdf`);

  try {
    // Delete if existing
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    const generatedPath = await generateInvoicePdf(data, outputPath);
    console.log(`PDF generated at: ${generatedPath}`);

    if (!fs.existsSync(outputPath)) {
      console.error(`FAIL: File does not exist at ${outputPath}`);
      process.exit(1);
    }

    const stats = fs.statSync(outputPath);
    if (stats.size === 0) {
      console.error(`FAIL: File is empty`);
      process.exit(1);
    }

    console.log(`PASS: PDF invoice generated successfully, size: ${stats.size} bytes`);
  } catch (err) {
    console.error("FAIL: Error generating PDF", err);
    process.exit(1);
  }
}

runTests();
