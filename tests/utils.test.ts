import { parsePriceAdvanced, parseDiscountOrTax, parseInvoiceTemplate, parseSettingsTemplate } from '../src/utils.js';

function runTests() {
  const priceTestCases = [
    { input: "Rp 15.000", expected: 15000 },
    { input: "15,000.50", expected: 15000.5 },
    { input: "1.250.000", expected: 1250000 },
    { input: "Rp1.250.000,5", expected: 1250000.5 },
    { input: "500", expected: 500 },
    { input: "0", expected: 0 },
    { input: "", expected: 0 },
  ];

  console.log("Running parsePriceAdvanced tests...");
  let passed = true;
  for (const tc of priceTestCases) {
    const got = parsePriceAdvanced(tc.input);
    if (got !== tc.expected) {
      console.error(`FAIL: parsePriceAdvanced("${tc.input}") = ${got}, expected ${tc.expected}`);
      passed = false;
    } else {
      console.log(`PASS: parsePriceAdvanced("${tc.input}") = ${got}`);
    }
  }

  const discountTestCases = [
    { input: "10%", expected: { value: 0.1, isPercentage: true } },
    { input: "Rp 5.000", expected: { value: 5000, isPercentage: false } },
    { input: "5000", expected: { value: 5000, isPercentage: false } },
    { input: "0%", expected: { value: 0, isPercentage: true } },
    { input: "0", expected: { value: 0, isPercentage: false } },
  ];

  console.log("\nRunning parseDiscountOrTax tests...");
  for (const tc of discountTestCases) {
    const got = parseDiscountOrTax(tc.input);
    if (got.value !== tc.expected.value || got.isPercentage !== tc.expected.isPercentage) {
      console.error(`FAIL: parseDiscountOrTax("${tc.input}") = ${JSON.stringify(got)}, expected ${JSON.stringify(tc.expected)}`);
      passed = false;
    } else {
      console.log(`PASS: parseDiscountOrTax("${tc.input}") = ${JSON.stringify(got)}`);
    }
  }

  // Test parseInvoiceTemplate
  console.log("\nRunning parseInvoiceTemplate tests...");
  const validInvoiceTemplate = `
    Pelanggan: Budi Sentoso
    Item:
    - Kopi Aren - 2 - Rp 15.000
    - Roti Bakar - 1 - 20000
    Diskon: 10%
    Pajak: 11%
    Dibayar: 30000
  `;
  const parsedInvoice = parseInvoiceTemplate(validInvoiceTemplate);
  if (!parsedInvoice || 
      parsedInvoice.customerName !== "Budi Sentoso" || 
      parsedInvoice.items.length !== 2 || 
      parsedInvoice.items[0].name !== "Kopi Aren" || 
      parsedInvoice.items[0].qty !== 2 || 
      parsedInvoice.items[0].price !== 15000 ||
      parsedInvoice.discountText !== "10%" ||
      parsedInvoice.taxText !== "11%" ||
      parsedInvoice.paidText !== "30000") {
    console.error("FAIL: parseInvoiceTemplate failed on valid input:", parsedInvoice);
    passed = false;
  } else {
    console.log("PASS: parseInvoiceTemplate valid input");
  }

  const invalidInvoiceTemplate = `
    Pelanggan: 
    Item:
    Diskon: 0
  `;
  const parsedInvalid = parseInvoiceTemplate(invalidInvoiceTemplate);
  if (parsedInvalid !== null) {
    console.error("FAIL: parseInvoiceTemplate should return null on invalid input");
    passed = false;
  } else {
    console.log("PASS: parseInvoiceTemplate invalid input");
  }

  // Test parseSettingsTemplate
  console.log("\nRunning parseSettingsTemplate tests...");
  const validSettingsTemplate = `
    Nama Toko: Toko Baru Keren
    Email Toko: info@tokobaru.id
    Alamat Toko: Jl. Baru No. 10
    No HP: 0812345
    Info Pembayaran: Transfer Mandiri 123
    Warna Tema: 2
  `;
  const parsedSettings = parseSettingsTemplate(validSettingsTemplate);
  if (parsedSettings.shopName !== "Toko Baru Keren" || 
      parsedSettings.shopEmail !== "info@tokobaru.id" || 
      parsedSettings.shopAddress !== "Jl. Baru No. 10" ||
      parsedSettings.shopPhone !== "0812345" ||
      parsedSettings.paymentInfo !== "Transfer Mandiri 123" || 
      parsedSettings.themeColor !== "#059669") {
    console.error("FAIL: parseSettingsTemplate failed on valid input:", parsedSettings);
    passed = false;
  } else {
    console.log("PASS: parseSettingsTemplate valid input");
  }

  if (passed) {
    console.log("\nAll tests passed successfully!");
  } else {
    process.exit(1);
  }
}

runTests();
