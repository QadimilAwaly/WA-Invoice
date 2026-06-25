import { InvoiceBotController } from '../src/controller.js';
import fs from 'fs';

async function runTests() {
  if (fs.existsSync("data/settings.json")) {
    fs.unlinkSync("data/settings.json");
  }
  console.log("Running InvoiceBotController state machine tests...");
  
  const controller = new InvoiceBotController();
  const userId = "user-test-123";
  const replies: { text: string; mediaPath?: string }[] = [];

  const replyFn = async (text: string, mediaPath?: string) => {
    replies.push({ text, mediaPath });
    if (mediaPath) {
      if (!fs.existsSync(mediaPath) || fs.statSync(mediaPath).size === 0) {
        console.error("FAIL: PDF file does not exist or is empty in callback:", mediaPath);
        process.exit(1);
      }
    }
  };

  // Step 1: Send 'halo' to verify the menu is printed
  await controller.handleMessage(userId, "halo", replyFn);
  if (!replies[0].text.includes("WhatsApp Invoice Generator")) {
    console.error("FAIL: Expected help menu in reply, got:", replies[0].text);
    process.exit(1);
  }
  console.log("PASS: Help menu matches");
  replies.length = 0; // Clear

  // Step 2: Send '/buat' to start session and get template prompt
  await controller.handleMessage(userId, "/buat", replyFn);
  if (!replies[0].text.includes("Pelanggan: Nama Pelanggan") || !replies[0].text.includes("Item:")) {
    console.error("FAIL: Expected invoice template prompt, got:", replies[0].text);
    process.exit(1);
  }
  console.log("PASS: Invoice template prompt verified");
  replies.length = 0;

  // Step 3: Send filled invoice template
  const filledInvoiceTemplate = `
    Pelanggan: Toko ABC
    Item:
    - Kopi Susu - 2 - Rp 15.000
    - Roti Cokelat - 1 - 20000
    Diskon: 10%
    Pajak: 11%
    Dibayar: 20000
  `;
  await controller.handleMessage(userId, filledInvoiceTemplate, replyFn);
  if (!replies[0].text.includes("*=== Konfirmasi Invoice ===*")) {
    console.error("FAIL: Expected invoice confirmation summary, got:", replies[0].text);
    process.exit(1);
  }
  // Subtotal = 2 * 15000 + 1 * 20000 = 50000
  // Discount = 10% of 50000 = 5000
  // Taxable = 45000
  // Tax = 11% of 45000 = 4950
  // Total = 49950
  // Paid = 20000
  // Sisa Tagihan = 29950
  if (!replies[0].text.includes("*Subtotal:* Rp 50.000") ||
      !replies[0].text.includes("*Diskon:* Rp 5.000") ||
      !replies[0].text.includes("*Pajak:* Rp 4.950") ||
      !replies[0].text.includes("*Total Akhir:* Rp 49.950") ||
      !replies[0].text.includes("*Dibayar/DP:* Rp 20.000") ||
      !replies[0].text.includes("*Sisa Tagihan:* Rp 29.950 (*BELUM LUNAS*)")) {
    console.error("FAIL: Summary numbers do not match calculations in message:", replies[0].text);
    process.exit(1);
  }
  console.log("PASS: Invoice summary totals and calculations verified from template");
  replies.length = 0;

  // Step 4: Confirm generation by sending 'ya'
  await controller.handleMessage(userId, "ya", replyFn);
  if (replies.length < 2) {
    console.error("FAIL: Expected at least 2 replies during finalization, got:", replies);
    process.exit(1);
  }
  if (!replies[0].text.includes("Sedang membuat invoice PDF")) {
    console.error("FAIL: Expected loading message first, got:", replies[0].text);
    process.exit(1);
  }
  if (!replies[1].text.includes("Berikut adalah invoice digital Anda")) {
    console.error("FAIL: Expected success message, got:", replies[1].text);
    process.exit(1);
  }
  const generatedPdfPath = replies[1].mediaPath;
  if (!generatedPdfPath) {
    console.error("FAIL: PDF path is missing");
    process.exit(1);
  }
  if (fs.existsSync(generatedPdfPath)) {
    console.error("FAIL: PDF file was not cleaned up after send:", generatedPdfPath);
    process.exit(1);
  }
  console.log(`PASS: PDF successfully generated and cleaned up from template confirm`);
  replies.length = 0;

  // Verify the session has cleared after confirmation
  await controller.handleMessage(userId, "ya", replyFn);
  if (replies.length > 0) {
    console.error("FAIL: Session was not cleared; bot responded to 'ya' when it should be idle. Replies:", replies);
    process.exit(1);
  }
  console.log("PASS: Session cleared successfully after confirmation");

  // Step 5: Settings Menu Test (Access /pengaturan)
  await controller.handleMessage(userId, "/pengaturan", replyFn);
  if (!replies[0].text.includes("*=== Pengaturan Bot Saat Ini ===*") || !replies[0].text.includes("INVOICE GENERATOR BOT")) {
    console.error("FAIL: Expected settings menu template prompt, got:", replies[0].text);
    process.exit(1);
  }
  console.log("PASS: Settings menu template prompt verified");
  replies.length = 0;

  // Step 6: Send modified settings template
  const modifiedSettingsTemplate = `
    Nama Toko: Toko Serba Ada
    Email Toko: info@tokoserba.id
    Alamat Toko: Ruko Melati No. 5
    No HP: 0899-8888-7777
    Info Pembayaran: Transfer BCA: 987-654-3210 (a/n Toko Serba Ada)
    Warna Tema: 2
  `;
  await controller.handleMessage(userId, modifiedSettingsTemplate, replyFn);
  if (!replies[0].text.includes("✓ Pengaturan berhasil diperbarui!")) {
    console.error("FAIL: Expected settings success message, got:", replies[0].text);
    process.exit(1);
  }
  console.log("PASS: Settings updated successfully from template");
  replies.length = 0;

  // Step 7: Verify updated settings in menu
  await controller.handleMessage(userId, "/pengaturan", replyFn);
  if (!replies[0].text.includes("Toko Serba Ada") || !replies[0].text.includes("Emerald Green")) {
    console.error("FAIL: Expected updated values in settings menu, got:", replies[0].text);
    process.exit(1);
  }
  console.log("PASS: Settings menu displays updated template values");
  replies.length = 0;

  // Exit settings
  await controller.handleMessage(userId, "/batal", replyFn);
  replies.length = 0;

  // Step 8: Generate second invoice to verify custom settings and LUNAS stamp
  await controller.handleMessage(userId, "/buat", replyFn);
  replies.length = 0;

  const secondInvoiceTemplate = `
    Pelanggan: Pelanggan Keren
    Item:
    - Kopi Premium - 1 - 50000
    Diskon: 0
    Pajak: 0
    Dibayar: 50000
  `;
  await controller.handleMessage(userId, secondInvoiceTemplate, replyFn);
  if (!replies[0].text.includes("*Sisa Tagihan:* Rp 0 (*LUNAS*)")) {
    console.error("FAIL: Expected Sisa Tagihan Rp 0 (LUNAS), got:", replies[0].text);
    process.exit(1);
  }
  replies.length = 0;

  await controller.handleMessage(userId, "ya", replyFn);
  if (replies.length < 2) {
    console.error("FAIL: Expected at least 2 replies during second finalization, got:", replies);
    process.exit(1);
  }
  const customPdfPath = replies[1].mediaPath;
  if (!customPdfPath) {
    console.error("FAIL: Custom PDF path is missing");
    process.exit(1);
  }
  if (fs.existsSync(customPdfPath)) {
    console.error("FAIL: Custom settings PDF file was not cleaned up after send:", customPdfPath);
    process.exit(1);
  }
  console.log(`PASS: Custom PDF successfully generated and automatically cleaned up from disk`);
  replies.length = 0;

  controller.destroy();
  console.log("All InvoiceBotController tests passed successfully!");
}

runTests();
