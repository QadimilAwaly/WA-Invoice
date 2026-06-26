import { SessionManager } from './session.js';
import { 
  parsePriceAdvanced, 
  parseDiscountOrTax, 
  parseInvoiceTemplate, 
  parseSettingsTemplate,
  parseFinanceTemplate
} from './utils.js';
import { generateInvoicePdf, type InvoiceData } from './pdf.js';
import { SettingsManager } from './settings.js';
import { FinanceManager } from './finance.js';
import path from 'path';
import fs from 'fs';
export class InvoiceBotController {
  private sessionManager = new SessionManager();
  private settingsManager = new SettingsManager();
  private financeManager = new FinanceManager();
  private inactivityInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run inactivity check every minute (60,000 ms)
    this.inactivityInterval = setInterval(() => {
      this.sessionManager.checkInactivity(600000); // 10 minutes timeout
    }, 60000);
  }

  /**
   * Cleans up timer when the controller is destroyed.
   */
  public destroy(): void {
    if (this.inactivityInterval) {
      clearInterval(this.inactivityInterval);
      this.inactivityInterval = null;
    }
  }

  /**
   * Process incoming messages and route them through the state machine.
   */
  public async handleMessage(
    userId: string,
    body: string,
    reply: (text: string, mediaPath?: string) => Promise<void>,
    contactJid?: string
  ): Promise<void> {
    const text = body.trim();
    const textLower = text.toLowerCase();
    const session = this.sessionManager.getSession(userId);

    // Command overrides
    if (textLower === '/batal') {
      this.sessionManager.clearSession(userId);
      await reply('❌ Pembuatan invoice atau pengaturan dibatalkan.');
      return;
    }

    if (textLower === '/help' || textLower === '/menu' || textLower === 'halo' || textLower === 'hi') {
      await reply(
        `*=== WhatsApp Invoice Generator ===*\n\n` +
        `Berikut perintah yang tersedia:\n` +
        `* \`/buat\` atau \`/invoice\` - Mulai buat invoice baru\n` +
        `* \`/pemasukan\` - Catat pemasukan baru\n` +
        `* \`/pengeluaran\` - Catat pengeluaran baru\n` +
        `* \`/laporan\` - Lihat ringkasan keuangan bulan ini\n` +
        `* \`/pengaturan\` - Buka menu pengaturan bot (Nama Toko, Bank, dll)\n` +
        `* \`/batal\` - Batalkan proses pembuatan invoice aktif atau keluar dari menu\n` +
        `* \`/help\` - Tampilkan menu bantuan ini\n\n` +
        `Silakan ketik \`/buat\` untuk memulai!`
      );
      return;
    }

    // Pemasukan / Pengeluaran Command overrides
    if (textLower === '/pemasukan' || textLower === '/pengeluaran') {
      if (session.step !== 'idle') {
        await reply('⚠️ Sesi pembuatan invoice sedang aktif. Selesaikan invoice Anda terlebih dahulu, atau ketik */batal* untuk membatalkan.');
        return;
      }
      const isIncome = textLower === '/pemasukan';
      const typeLabel = isIncome ? 'Pemasukan' : 'Pengeluaran';
      this.sessionManager.updateSession(userId, { 
        step: 'waiting_finance_template', 
        financeType: isIncome ? 'income' : 'expense' 
      });
      await reply(
        `*=== Catat ${typeLabel} ===*\n\n` +
        `Silakan salin, isi, dan kirim kembali template di bawah ini:\n\n` +
        `Nominal: \n` +
        `Kategori: ${isIncome ? 'Penjualan / Lainnya' : 'Bahan Baku / Operasional / Makan'}\n` +
        `Catatan: `
      );
      return;
    }

    if (textLower === '/laporan') {
      const summary = this.financeManager.getMonthlySummary(userId);
      await reply(
        `*=== Laporan Keuangan Bulan Ini ===*\n\n` +
        `*Total Pemasukan:* Rp ${summary.income.toLocaleString('id-ID')}\n` +
        `*Total Pengeluaran:* Rp ${summary.expense.toLocaleString('id-ID')}\n` +
        `*Saldo Bersih:* Rp ${summary.balance.toLocaleString('id-ID')}`
      );
      return;
    }

    // Settings template command override from idle
    if (textLower === '/pengaturan' || textLower === '/setting') {
      if (session.step !== 'idle') {
        await reply('⚠️ Sesi pembuatan invoice sedang aktif. Selesaikan invoice Anda terlebih dahulu, atau ketik */batal* untuk membatalkan.');
        return;
      }
      this.sessionManager.updateSession(userId, { step: 'waiting_setting_template' });
      const settings = this.settingsManager.getSettings(userId);
      const themeNames: Record<string, string> = {
        '#1A365D': 'Navy Blue',
        '#059669': 'Emerald Green',
        '#9B2C2C': 'Maroon Red',
        '#2D3748': 'Charcoal Gray'
      };
      
      const themeCodes: Record<string, string> = {
        '#1A365D': '1',
        '#059669': '2',
        '#9B2C2C': '3',
        '#2D3748': '4'
      };
      const themeName = themeNames[settings.themeColor] || 'Custom';
      const themeCode = themeCodes[settings.themeColor] || '1';

      await reply(
        `*=== Pengaturan Bot Saat Ini ===*\n\n` +
        `*1. Nama Toko:* ${settings.shopName}\n` +
        `*2. Email Toko:* ${settings.shopEmail}\n` +
        `*3. Alamat Toko:* ${settings.shopAddress}\n` +
        `*4. No HP:* ${settings.shopPhone}\n` +
        `*5. Info Pembayaran:* ${settings.paymentInfo}\n` +
        `*6. Warna Tema:* ${themeName}\n\n` +
        `---\n` +
        `Untuk mengubah pengaturan, silakan salin, edit, dan kirim kembali template di bawah ini:\n\n` +
        `Nama Toko: ${settings.shopName}\n` +
        `Email Toko: ${settings.shopEmail}\n` +
        `Alamat Toko: ${settings.shopAddress}\n` +
        `No HP: ${settings.shopPhone}\n` +
        `Info Pembayaran: ${settings.paymentInfo}\n` +
        `Warna Tema: ${themeCode}\n` +
        `_(1: Navy, 2: Green, 3: Red, 4: Gray)_`
      );
      return;
    }

    if (session.step === 'idle') {
      if (textLower === '/buat' || textLower === '/invoice') {
        this.sessionManager.updateSession(userId, { step: 'waiting_invoice_template', items: [] });
        await reply(
          `*=== Buat Invoice Baru ===*\n\n` +
          `Silakan salin, isi, dan kirim kembali template di bawah ini:\n\n` +
          `Pelanggan: Nama Pelanggan\n` +
          `Item:\n` +
          `- Barang 1 - 2 - Rp 15.000\n` +
          `- Barang 2 - 1 - 20000\n` +
          `Diskon: 0\n` +
          `Pajak: 0\n` +
          `Dibayar: 0\n\n` +
          `_(Ketik /batal kapan saja untuk membatalkan)_`
        );
      }
      return;
    }

    // Process active steps
    switch (session.step) {
      case 'waiting_invoice_template': {
        const parsed = parseInvoiceTemplate(text);
        if (!parsed) {
          await reply(
            `⚠️ Format salah atau data tidak lengkap. Pastikan format penulisan benar (Pelanggan dan minimal 1 Item terdaftar).\n\n` +
            `Silakan salin, isi, dan kirim kembali template di bawah ini:\n\n` +
            `Pelanggan: Nama Pelanggan\n` +
            `Item:\n` +
            `- Barang 1 - 2 - Rp 15.000\n` +
            `Diskon: 0\n` +
            `Pajak: 0\n` +
            `Dibayar: 0`
          );
          return;
        }

        const { value: discountVal, isPercentage: discountPct } = parseDiscountOrTax(parsed.discountText);
        const { value: taxVal, isPercentage: taxPct } = parseDiscountOrTax(parsed.taxText);
        const paidVal = parsePriceAdvanced(parsed.paidText);

        if (isNaN(paidVal) || paidVal < 0) {
          await reply('⚠️ Jumlah pembayaran tidak valid. Silakan coba lagi.');
          return;
        }

        const subtotal = parsed.items.reduce((sum, item) => sum + item.qty * item.price, 0);
        const discountAmount = discountPct ? subtotal * discountVal : discountVal;
        const taxableAmount = Math.max(0, subtotal - discountAmount);
        const taxAmount = taxPct ? taxableAmount * taxVal : taxVal;
        const total = taxableAmount + taxAmount;
        const balanceDue = Math.max(0, total - paidVal);
        const status = balanceDue === 0 ? "LUNAS" : "BELUM LUNAS";

        this.sessionManager.updateSession(userId, {
          step: 'confirm',
          customerName: parsed.customerName,
          items: parsed.items,
          discount: discountVal,
          discountIsPercentage: discountPct,
          tax: taxVal,
          taxIsPercentage: taxPct,
          paid: paidVal
        });

        const itemsList = parsed.items
          .map((it) => `- ${it.name} (${it.qty}x) = Rp ${(it.qty * it.price).toLocaleString('id-ID')}`)
          .join('\n');

        await reply(
          `*=== Konfirmasi Invoice ===*\n\n` +
          `*Pelanggan:* ${parsed.customerName}\n` +
          `*Daftar Item:*\n${itemsList}\n\n` +
          `*Subtotal:* Rp ${subtotal.toLocaleString('id-ID')}\n` +
          `*Diskon:* Rp ${discountAmount.toLocaleString('id-ID')}\n` +
          `*Pajak:* Rp ${taxAmount.toLocaleString('id-ID')}\n` +
          `*Total Akhir:* Rp ${total.toLocaleString('id-ID')}\n` +
          `*Dibayar/DP:* Rp ${paidVal.toLocaleString('id-ID')}\n` +
          `*Sisa Tagihan:* Rp ${balanceDue.toLocaleString('id-ID')} (*${status}*)\n\n` +
          `Ketik *ya* untuk generate PDF & kirim invoice, atau ketik */batal* untuk membatalkan.`
        );
        break;
      }

      case 'waiting_finance_template': {
        const parsed = parseFinanceTemplate(text);
        if (!parsed.amount || parsed.amount <= 0) {
          await reply('⚠️ Nominal tidak valid. Pastikan format Nominal diisi dengan angka.');
          return;
        }
        if (!parsed.category) {
          await reply('⚠️ Kategori wajib diisi. Silakan isi kembali template dengan lengkap.');
          return;
        }

        const { financeType } = session;
        if (financeType) {
          this.financeManager.addRecord(userId, financeType, parsed.amount, parsed.category, parsed.note || '');
          this.sessionManager.clearSession(userId);
          await reply(`✓ Catatan *${financeType === 'income' ? 'Pemasukan' : 'Pengeluaran'}* sebesar Rp ${parsed.amount.toLocaleString('id-ID')} berhasil disimpan.`);
        } else {
          this.sessionManager.clearSession(userId);
          await reply('⚠️ Terjadi kesalahan data keuangan. Sesi dibatalkan.');
        }
        break;
      }

      case 'waiting_setting_template': {
        const parsed = parseSettingsTemplate(text);
        const updates: Partial<typeof DEFAULT_SETTINGS> = {};

        if (parsed.shopName) updates.shopName = parsed.shopName;
        if (parsed.shopEmail) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(parsed.shopEmail)) {
            await reply('⚠️ Format email tidak valid. Silakan kirim kembali template dengan email yang benar (contoh: info@toko.id):');
            return;
          }
          updates.shopEmail = parsed.shopEmail;
        }
        if (parsed.shopAddress) updates.shopAddress = parsed.shopAddress;
        if (parsed.shopPhone) updates.shopPhone = parsed.shopPhone;
        if (parsed.paymentInfo) updates.paymentInfo = parsed.paymentInfo;
        if (parsed.themeColor) updates.themeColor = parsed.themeColor;

        if (Object.keys(updates).length > 0) {
          this.settingsManager.updateSettings(userId, updates);
          this.sessionManager.clearSession(userId);
          await reply('✓ Pengaturan berhasil diperbarui!');
        } else {
          await reply(
            '⚠️ Format tidak dikenali atau tidak ada perubahan. Silakan edit nilai di sebelah kanan tanda titik dua (:) pada template, atau ketik */batal* untuk membatalkan.'
          );
        }
        break;
      }

      case 'confirm': {
        if (textLower === 'ya') {
          await reply('⏳ Sedang membuat invoice PDF...');
          
          const now = new Date();
          const yy = now.getFullYear().toString().slice(-2);
          const mm = (now.getMonth() + 1).toString().padStart(2, '0');
          const dd = now.getDate().toString().padStart(2, '0');
          const yymmdd = `${yy}${mm}${dd}`;

          const targetPhoneJid = contactJid || userId;
          const phoneNumbersOnly = targetPhoneJid.split('@')[0].replace(/\D/g, '');
          const lastFourDigits = phoneNumbersOnly.slice(-4).padStart(4, '0');
          const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
          const invoiceNumber = `INV-${yymmdd}-${lastFourDigits}-${randomSuffix}`;
          
          const dateStr = now.toISOString().split('T')[0];
          const subtotal = session.items.reduce((sum, item) => sum + item.qty * item.price, 0);
          const discountAmount = session.discountIsPercentage ? subtotal * session.discount : session.discount;
          const taxableAmount = Math.max(0, subtotal - discountAmount);
          const taxAmount = session.taxIsPercentage ? taxableAmount * session.tax : session.tax;
          const total = taxableAmount + taxAmount;
          const paidAmount = session.paid;
          const balanceDue = Math.max(0, total - paidAmount);

          const settings = this.settingsManager.getSettings(userId);
          const invoiceData: InvoiceData = {
            invoiceNumber,
            date: dateStr,
            customerName: session.customerName,
            items: session.items,
            subtotal,
            discountAmount,
            taxAmount,
            total,
            paidAmount,
            balanceDue,
            shopName: settings.shopName,
            shopEmail: settings.shopEmail,
            shopAddress: settings.shopAddress,
            shopPhone: settings.shopPhone,
            paymentInfo: settings.paymentInfo,
            themeColor: settings.themeColor
          };

          const outputPath = path.join('invoices', `${invoiceNumber}.pdf`);

          try {
            const pdfPath = await generateInvoicePdf(invoiceData, outputPath);
            await reply('Berikut adalah invoice digital Anda. Terima kasih!', pdfPath);
            this.sessionManager.clearSession(userId);

            // Delete temporary file to save server storage
            try {
              if (fs.existsSync(pdfPath)) {
                fs.unlinkSync(pdfPath);
              }
            } catch (cleanupErr) {
              console.error('Failed to delete temporary invoice file:', cleanupErr);
            }
          } catch (err) {
            console.error('Error generating/sending PDF:', err);
            await reply('⚠️ Gagal membuat PDF invoice. Silakan coba lagi dengan ketik /buat.');
            this.sessionManager.clearSession(userId);
          }
        } else {
          await reply('Ketik *ya* untuk konfirmasi & kirim, atau ketik */batal* untuk membatalkan.');
        }
        break;
      }
    }
  }
}

// Private helper interface to resolve compilation of Partial<typeof DEFAULT_SETTINGS>
interface DefaultSettingsMock {
  shopName: string;
  shopEmail: string;
  shopAddress: string;
  shopPhone: string;
  paymentInfo: string;
  themeColor: string;
}
const DEFAULT_SETTINGS: DefaultSettingsMock = {
  shopName: "",
  shopEmail: "",
  shopAddress: "",
  shopPhone: "",
  paymentInfo: "",
  themeColor: ""
};
