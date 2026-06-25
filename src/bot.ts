import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import { InvoiceBotController } from './controller.js';
import fs from 'fs';

const defaultEdgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || 
  (fs.existsSync(defaultEdgePath) ? defaultEdgePath : undefined);

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ],
    headless: true
  }
});

const controller = new InvoiceBotController();
client.on('loading_screen', (percent, message) => {
  console.log(`[INFO] WhatsApp Web Loading: ${percent}% - ${message}`);
});

client.on('authenticated', () => {
  console.log('[INFO] WhatsApp Web terautentikasi (berhasil login)!');
});

client.on('auth_failure', (msg) => {
  console.error('[ERROR] Otentikasi WhatsApp Web gagal:', msg);
});

client.on('disconnected', (reason) => {
  console.log('[INFO] WhatsApp Web terputus:', reason);
});

client.on('qr', (qr) => {
  console.log('[INFO] Silakan pindai QR code berikut di aplikasi WhatsApp Anda:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('[SUCCESS] WhatsApp Bot Generator Invoice siap!');
});

client.on('message_ack', (msg, ack) => {
  console.log(`[ACK] Status pengiriman pesan | ID: ${msg.id._serialized} | Status: ${ack}`);
});

const sentMessageIds = new Set<string>();

client.on('message_create', async (msg) => {
  const userId = msg.from;
  const body = msg.body;

  console.log(`[CHAT] Pesan Terdeteksi | ID: ${msg.id._serialized} | Dari: ${msg.from} | Ke: ${msg.to} | fromMe: ${msg.fromMe} | Isi: "${body}"`);

  // Ignore group chats
  if (userId.endsWith('@g.us') || msg.to.endsWith('@g.us')) {
    console.log(`[CHAT] Pesan Diabaikan: Adalah pesan grup.`);
    return;
  }

  // Ignore messages sent by the bot itself
  if (sentMessageIds.has(msg.id._serialized)) {
    console.log(`[CHAT] Pesan Diabaikan: Dikirim oleh aplikasi bot ini.`);
    return;
  }

  // Resolve the canonical JID of the contact
  let contactJid = userId;
  try {
    const contact = await msg.getContact();
    contactJid = contact.id._serialized;
    console.log(`[CHAT] Resolved Contact JID: ${contactJid}`);
  } catch (contactErr) {
    console.error('[ERROR] Gagal mendapatkan detail kontak:', contactErr);
  }

  // If the message was sent by ourselves, only process if it is a self-chat
  const myJid = client.info?.wid?._serialized;
  if (msg.fromMe && myJid && msg.to !== myJid) {
    console.log(`[CHAT] Pesan Diabaikan: Pesan keluar (fromMe) ke kontak lain (${msg.to}).`);
    return;
  }

  console.log(`[CHAT] Memproses pesan dari: ${userId} (Contact: ${contactJid})`);

  try {
    await controller.handleMessage(userId, body, async (replyText, mediaPath) => {
      console.log(`[CHAT] Mengirim Balasan ke: ${userId} | Teks: "${replyText.substring(0, 60)}..." | Lampiran: ${mediaPath || 'Tidak ada'}`);
      
      let sentMsg;
      if (mediaPath) {
        const media = MessageMedia.fromFilePath(mediaPath);
        sentMsg = await client.sendMessage(userId, media, { caption: replyText });
      } else {
        sentMsg = await client.sendMessage(userId, replyText);
      }

      if (sentMsg && sentMsg.id && sentMsg.id._serialized) {
        sentMessageIds.add(sentMsg.id._serialized);
        if (sentMessageIds.size > 1000) {
          const firstKey = sentMessageIds.keys().next().value;
          if (firstKey !== undefined) {
            sentMessageIds.delete(firstKey);
          }
        }
      }
    }, contactJid);
  } catch (err) {
    console.error('[ERROR] Terjadi error saat memproses pesan:', err);
    try {
      await client.sendMessage(userId, '⚠️ Terjadi kesalahan internal saat memproses pesan.');
    } catch (replyErr) {
      console.error('Error sending error reply:', replyErr);
    }
  }
});

console.log('[INFO] Sedang menginisialisasi WhatsApp Web client...');
client.initialize();
