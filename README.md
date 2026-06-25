# WhatsApp Invoice Generator Bot

WhatsApp Invoice Generator Bot adalah aplikasi berbasis Node.js/Bun yang memungkinkan Anda membuat faktur (invoice) profesional berformat PDF langsung melalui percakapan WhatsApp. Bot ini memandu pengguna langkah demi langkah secara interaktif, menghitung subtotal, diskon, dan pajak secara otomatis, lalu mengirimkan file PDF kembali kepada pengguna.

---

## Fitur Utama

1. **Alur Interaktif (State Machine)**: Memandu pembuatan invoice dari input nama pelanggan, daftar item belanja, diskon, pajak, hingga jumlah dibayar (DP/Lunas).
2. **Parser Harga Fleksibel**: Menerima berbagai format penulisan mata uang Rupiah Indonesia (contoh: `Rp 15.000`, `15,000.50`, `1.250.000`, `15000`).
3. **Kalkulasi & Status Pembayaran Otomatis**: Mendukung diskon, pajak, nominal pembayaran (Dibayar/DP), menghitung sisa tagihan, serta menandai status invoice secara otomatis sebagai **LUNAS** atau **BELUM LUNAS**.
4. **Pencatatan Keuangan**: Mendukung perintah `/pemasukan`, `/pengeluaran`, dan `/laporan` untuk mencatat transaksi dan melihat saldo bulanan.
5. **Template PDF Profesional**: Menggunakan `pdfkit` untuk menggambar file invoice berformat A4 dengan desain yang elegan (Navy Blue, Emerald Green, dll) yang memuat info toko, pelanggan, status pembayaran, dan rincian transaksi yang terstruktur rapi.
6. **Kustomisasi via Chatbot**: Memungkinkan kustomisasi Nama Toko, Email Toko, Rekening/Info Pembayaran, dan Warna Tema secara dinamis melalui menu `/pengaturan`.
7. **Auto Cleanup**: Sesi pembuatan invoice akan otomatis dihapus jika pengguna tidak aktif selama 10 menit.
8. **Command Mudah**: Mendukung perintah pintas seperti `/buat` (atau `/invoice`), `/pemasukan`, `/pengeluaran`, `/laporan`, `/pengaturan` (atau `/setting`), `/batal`, `/help`, dan `/menu`.
---

## Prasyarat

Sebelum menjalankan aplikasi, pastikan Anda telah menginstal:
*   [Bun](https://bun.sh/) (Disarankan) ATAU [Node.js](https://nodejs.org/) (Versi 18 ke atas)

---

## Instalasi

1. Pastikan Anda berada di direktori proyek ini.
2. Instal seluruh dependensi yang diperlukan:

 Menggunakan Bun:
 ```bash
 bun install
 ```

 Menggunakan NPM:
 ```bash
 npm install
 ```

---

## Cara Menjalankan Aplikasi

1. Jalankan server bot dengan perintah berikut:

 Menggunakan Bun:
 ```bash
 bun start
 ```

 Menggunakan NPM:
 ```bash
 npm start
 ```

2. Setelah server berjalan, terminal akan menampilkan **QR Code**.
3. Buka WhatsApp di ponsel Anda, pilih menu **Linked Devices / Perangkat Tertaut**, lalu scan QR Code tersebut.
4. Jika berhasil, terminal akan memunculkan log:
   ```text
   WhatsApp Bot Generator Invoice siap!
   ```
5. Bot siap menerima pesan dari pengguna.

---

## Contoh Alur Penggunaan di WhatsApp

1. Kirim pesan **`halo`** atau **`/help`** untuk melihat daftar perintah.
2. Kirim perintah **`/buat`** atau **`/invoice`** untuk memulai pembuatan invoice baru.
3. Bot akan mengirimkan template rincian invoice. Salin, lengkapi, dan kirimkan kembali dalam satu pesan:
   ```text
   Pelanggan: Toko Budi Sentoso
   Item:
   - Kopi Aren - 2 - Rp 15.000
   - Kue Pancong - 1 - 20000
   Diskon: 10%
   Pajak: 11%
   Dibayar: 20000
   ```
4. Bot akan menampilkan ringkasan rincian invoice hasil kalkulasi otomatis (Subtotal, Diskon, Pajak, Total Akhir, Jumlah Dibayar, Sisa Tagihan, serta Status Pembayaran).
5. Ketik **`ya`** untuk mengonfirmasi. Bot akan membuat invoice PDF menggunakan data profil toko serta warna tema pilihan Anda, lengkap dengan status **LUNAS** atau **BELUM LUNAS**, lalu mengirimkannya dalam bentuk dokumen dan otomatis menghapus file sementara dari disk server.
6. Ketik **`/batal`** kapan saja untuk membatalkan proses pembuatan invoice atau keluar dari menu pengaturan yang sedang berjalan.
## Pencatatan Keuangan (`/pemasukan`, `/pengeluaran`, `/laporan`)

Bot ini menyediakan fitur sederhana untuk mencatat arus kas masuk dan keluar secara harian:

1. **Mencatat Transaksi**:
   Ketik **`/pemasukan`** atau **`/pengeluaran`** untuk memulai pencatatan.
   *   Bot akan meminta nominal (jumlah uang).
   *   Bot akan meminta kategori (misal: `Penjualan`, `Makan`, `Transport`).
   *   Bot akan meminta catatan singkat (opsional).
2. **Melihat Laporan**:
   Ketik **`/laporan`** untuk melihat ringkasan keuangan bulan berjalan, yang mencakup:
   *   Total Pemasukan
   *   Total Pengeluaran
   *   Saldo Bersih (Total Pemasukan - Total Pengeluaran)

---


---

## Kustomisasi Pengaturan (`/pengaturan`)

Ketik **`/pengaturan`** atau **`/setting`** di chat untuk masuk ke menu kustomisasi profil bot. 
Bot akan menampilkan pengaturan saat ini beserta template yang dapat disalin, diedit, dan dikirimkan kembali dalam satu pesan untuk memperbarui profil Anda sekaligus:
```text
Nama Toko: Toko Budi Sentoso
Email Toko: info@budisentoso.id
Alamat Toko: Ruko Melati No. 5, Jakarta
No HP: 0899-8888-7777
Info Pembayaran: Bank Mandiri 123-456-789 a/n Budi Sentoso
Warna Tema: 2
```

*   **Nama Toko**: Mengganti nama bisnis/toko Anda di bagian header kiri atas invoice.
*   **Email Toko**: Mengganti alamat email kontak bisnis Anda.
*   **Alamat Toko**: Mengganti alamat lokasi fisik bisnis/toko Anda di header kiri atas invoice.
*   **No HP**: Mengganti nomor telepon/HP kontak bisnis Anda di header kiri atas invoice.
*   **Info Pembayaran**: Mengubah instruksi transfer pembayaran di kotak footer bawah invoice.
*   **Warna Tema**: Memilih warna branding invoice Anda (1: Navy Blue, 2: Emerald Green, 3: Maroon Red, 4: Charcoal Gray).

Seluruh pengaturan ini akan disimpan secara otomatis per nomor WhatsApp pengguna di file `data/settings.json` sehingga tetap tersimpan meskipun server bot dijalankan ulang.
---

## Menjalankan Unit & Integration Test

Aplikasi ini dilengkapi dengan test suite lengkap untuk memvalidasi parser harga, managemen sesi, pembuatan PDF, alur percakapan (state machine), serta fitur keuangan:

Menjalankan seluruh pengujian:
```bash
bun run tests/utils.test.ts && bun run tests/session.test.ts && bun run tests/pdf.test.ts && bun run tests/finance.test.ts && bun run tests/controller.test.ts
```

---

├── src/
│   ├── bot.ts           # Entry point utama inisialisasi Client WhatsApp Web
│   ├── controller.ts    # Logika alur percakapan bot (State Machine)
│   ├── finance.ts       # Manajemen pencatatan pemasukan dan pengeluaran
│   ├── pdf.ts           # Logika pembuatan file PDF dengan PDFKit (dinamis tema & profil)
│   ├── session.ts       # Manajemen sesi pengguna dan deteksi masa kedaluwarsa (inactivity)
│   ├── settings.ts      # Manajemen penyimpanan konfigurasi profil toko & tema per pengguna
│   └── utils.ts         # Parser teks harga, diskon, dan pajak
├── tests/
│   ├── controller.test.ts
│   ├── finance.test.ts
│   ├── pdf.test.ts
│   ├── session.test.ts
│   └── utils.test.ts
├── invoices/            # Tempat penyimpanan sementara file PDF invoice hasil generate
├── data/                # Database JSON lokal tempat menyimpan konfigurasi pengguna & catatan keuangan
├── package.json
└── tsconfig.json
