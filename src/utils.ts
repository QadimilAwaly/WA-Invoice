import type { InvoiceItem } from './session.js';

export interface ParsedInvoiceInput {
  customerName: string;
  items: InvoiceItem[];
  discountText: string;
  taxText: string;
  paidText: string;
}

export interface ParsedSettingsInput {
  shopName?: string;
  shopEmail?: string;
  shopAddress?: string;
  shopPhone?: string;
  paymentInfo?: string;
  themeColor?: string;
}
/**
 * Parses a price string into a number.
 * Handles Rupiah variations like "Rp 15.000", "15,000.50", "1.250.000", "Rp1.250.000,5" etc.
 */
export function parsePriceAdvanced(input: string): number {
  // Strip Rp and whitespace
  let cleaned = input.replace(/rp/gi, '').replace(/\s+/g, '');
  if (!cleaned) return 0;

  // Detect decimal suffix at the end: .xx or ,xx or .x or ,x
  // Examples:
  // "15.000,50" -> match is ",50"
  // "15,000.5" -> match is ".5"
  // "15000" -> no match
  // "15.000" -> match is ".000" but we only match 1 or 2 digits: \d{1,2}
  const centsMatch = cleaned.match(/[.,](\d{1,2})$/);
  let cents = 0;
  if (centsMatch) {
    cents = parseFloat("0." + centsMatch[1]);
    cleaned = cleaned.slice(0, centsMatch.index);
  }

  // Remove all other non-digit characters (like thousands separators)
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (!digitsOnly && cents === 0) return 0;

  const baseValue = digitsOnly ? parseInt(digitsOnly, 10) : 0;
  return baseValue + cents;
}

/**
 * Parses a discount or tax input which can be percentage (e.g. "10%") or nominal (e.g. "5000").
 */
export function parseDiscountOrTax(input: string): { value: number; isPercentage: boolean } {
  const cleaned = input.trim();
  if (cleaned.endsWith('%')) {
    const valStr = cleaned.slice(0, -1).trim();
    const val = parsePriceAdvanced(valStr);
    return { value: val / 100, isPercentage: true };
  }
  const val = parsePriceAdvanced(cleaned);
  return { value: val, isPercentage: false };
}
/**
 * Parses the multi-line invoice template format.
 * Returns null if the template structure (Pelanggan or Items) is invalid.
 */
export function parseInvoiceTemplate(text: string): ParsedInvoiceInput | null {
  const lines = text.split('\n');
  let customerName = '';
  const items: InvoiceItem[] = [];
  let discountText = '0';
  let taxText = '0';
  let paidText = '0';
  let parsingItems = false;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const lowerLine = line.toLowerCase();

    if (lowerLine.startsWith('pelanggan:')) {
      customerName = line.slice('pelanggan:'.length).trim();
      parsingItems = false;
      continue;
    }

    if (lowerLine.startsWith('item:')) {
      parsingItems = true;
      continue;
    }

    if (lowerLine.startsWith('diskon:')) {
      discountText = line.slice('diskon:'.length).trim();
      parsingItems = false;
      continue;
    }

    if (lowerLine.startsWith('pajak:')) {
      taxText = line.slice('pajak:'.length).trim();
      parsingItems = false;
      continue;
    }

    if (lowerLine.startsWith('dibayar:')) {
      paidText = line.slice('dibayar:'.length).trim();
      parsingItems = false;
      continue;
    }

    if (parsingItems) {
      let itemLine = line;
      if (itemLine.startsWith('-') || itemLine.startsWith('*')) {
        itemLine = itemLine.slice(1).trim();
      } else {
        const numMatch = itemLine.match(/^\d+[\s.)-]/);
        if (numMatch) {
          itemLine = itemLine.slice(numMatch[0].length).trim();
        }
      }

      const parts = itemLine.split('-');
      if (parts.length === 3) {
        const name = parts[0].trim();
        const qty = parseInt(parts[1].trim(), 10);
        const price = parsePriceAdvanced(parts[2].trim());
        if (name && !isNaN(qty) && qty > 0 && price >= 0) {
          items.push({ name, qty, price });
        }
      }
    }
  }

  if (!customerName || items.length === 0) {
    return null;
  }

  return {
    customerName,
    items,
    discountText,
    taxText,
    paidText
  };
}

/**
 * Parses the multi-line settings template format.
 */
export function parseSettingsTemplate(text: string): ParsedSettingsInput {
  const lines = text.split('\n');
  const result: ParsedSettingsInput = {};

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const lowerLine = line.toLowerCase();

    if (lowerLine.startsWith('nama toko:')) {
      result.shopName = line.slice('nama toko:'.length).trim();
    } else if (lowerLine.startsWith('email toko:')) {
      result.shopEmail = line.slice('email toko:'.length).trim();
    } else if (lowerLine.startsWith('alamat toko:')) {
      result.shopAddress = line.slice('alamat toko:'.length).trim();
    } else if (lowerLine.startsWith('no hp:')) {
      result.shopPhone = line.slice('no hp:'.length).trim();
    } else if (lowerLine.startsWith('info pembayaran:')) {
      result.paymentInfo = line.slice('info pembayaran:'.length).trim();
    } else if (lowerLine.startsWith('warna tema:')) {
      const val = line.slice('warna tema:'.length).trim();
      const colorMap: Record<string, string> = {
        '1': '#1A365D',
        '2': '#059669',
        '3': '#9B2C2C',
        '4': '#2D3748'
      };

      if (colorMap[val]) {
        result.themeColor = colorMap[val];
      } else {
        const reverseThemeNames: Record<string, string> = {
          'navy blue': '#1A365D',
          'emerald green': '#059669',
          'maroon red': '#9B2C2C',
          'charcoal gray': '#2D3748',
          'biru': '#1A365D',
          'hijau': '#059669',
          'merah': '#9B2C2C',
          'abu-abu': '#2D3748'
        };
        const hex = reverseThemeNames[val.toLowerCase()];
        if (hex) {
          result.themeColor = hex;
        }
      }
    }
  }

  return result;
}

export interface ParsedFinanceInput {
  amount?: number;
  category?: string;
  note?: string;
}

/**
 * Parses the finance template text submitted by the user.
 */
export function parseFinanceTemplate(text: string): ParsedFinanceInput {
  const lines = text.split('\n');
  const result: ParsedFinanceInput = {};

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const lowerLine = line.toLowerCase();

    if (lowerLine.startsWith('nominal:')) {
      const amountStr = line.slice('nominal:'.length).trim();
      const amount = parsePriceAdvanced(amountStr);
      if (!isNaN(amount) && amount > 0) {
        result.amount = amount;
      }
    } else if (lowerLine.startsWith('kategori:')) {
      result.category = line.slice('kategori:'.length).trim();
    } else if (lowerLine.startsWith('catatan:')) {
      result.note = line.slice('catatan:'.length).trim();
    }
  }

  return result;
}
