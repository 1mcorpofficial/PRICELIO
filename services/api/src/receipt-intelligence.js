const { query } = require('./db');

const SUMMARY_LINE_PATTERN = /\b(total|subtotal|suma|suma\s+mok[eė]ti|mok[eė]ti|pvm|vat|change|gr[aą]ža|cash|card|kortel[eė]|payment|atsiskaitymas|kvitas|čekis|cekis)\b/i;
const DISCOUNT_LINE_PATTERN = /\b(nuolaida|akcija|discount|kortel[eė]s?\s+nuolaida|sutaup|coupon|kuponas)\b/i;

const CHAIN_SYNONYMS = [
  { canonical: 'Maxima', aliases: ['maxima', 'xxx'] },
  { canonical: 'Rimi', aliases: ['rimi'] },
  { canonical: 'Iki', aliases: ['iki', 'iki express'] },
  { canonical: 'Lidl', aliases: ['lidl'] },
  { canonical: 'Norfa', aliases: ['norfa'] },
  { canonical: 'Silas', aliases: ['šilas', 'silas'] },
  { canonical: 'Aibe', aliases: ['aibė', 'aibe'] },
  { canonical: 'Moki Veži', aliases: ['moki veži', 'mokivezi', 'moki vezi'] },
  { canonical: 'Eurovaistinė', aliases: ['eurovaistinė', 'eurovaistine'] },
  { canonical: 'Drogas', aliases: ['drogas'] },
  { canonical: 'Ermitažas', aliases: ['ermitazas', 'ermitažas'] }
];

const TOKEN_STOPWORDS = new Set([
  'vnt', 'kg', 'g', 'gr', 'ml', 'l', 'lt', 'eur', 'akcija', 'nuolaida',
  'kortele', 'kortelė', 'nuol', 'x', 'pakuote', 'pak', 'svor'
]);

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function toNumber(value) {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number(value);
  }
  const cleaned = String(value)
    .replace(/[€\s]/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveNumber(value, fallback = null) {
  const n = toNumber(value);
  if (n == null || !Number.isFinite(n)) return fallback;
  return n > 0 ? n : fallback;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeItemName(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[|*_]/g, ' ')
    .trim();
}

function normalizeProductQuery(value) {
  const base = normalizeText(value)
    // Remove likely numeric fragments, multipliers and size tokens.
    .replace(/\b\d+[xх]\d+\b/g, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s?(?:kg|g|gr|ml|l|vnt|pak|eur)\b/g, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = base
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !TOKEN_STOPWORDS.has(t))
    .slice(0, 8);

  return {
    text: tokens.join(' '),
    tokens
  };
}

function classifyReceiptLine(rawName, totalPrice, hintedType = null) {
  const hint = String(hintedType || '').trim().toLowerCase();
  if (['product', 'discount', 'summary', 'noise'].includes(hint)) {
    return hint;
  }
  const name = normalizeText(rawName);
  if (!name) return 'noise';
  if (SUMMARY_LINE_PATTERN.test(name)) return 'summary';
  if (DISCOUNT_LINE_PATTERN.test(name)) return 'discount';
  if (typeof totalPrice === 'number' && totalPrice < 0) return 'discount';
  if (name.length < 2) return 'noise';
  return 'product';
}

function mergeDateAndTime(receiptDate, receiptTime) {
  const dateText = String(receiptDate || '').trim();
  if (!dateText) return null;
  const normalizedDate = dateText.match(/^\d{4}-\d{2}-\d{2}$/)
    ? dateText
    : null;
  if (!normalizedDate) return null;

  const timeText = String(receiptTime || '').trim();
  if (timeText && /^\d{2}:\d{2}$/.test(timeText)) {
    const combined = new Date(`${normalizedDate}T${timeText}:00`);
    return Number.isNaN(combined.getTime()) ? null : combined.toISOString();
  }
  const dateOnly = new Date(`${normalizedDate}T00:00:00`);
  return Number.isNaN(dateOnly.getTime()) ? null : dateOnly.toISOString();
}

function pickFirst(...values) {
  for (const v of values) {
    if (v != null && String(v).trim() !== '') return v;
  }
  return null;
}

function normalizeExtractionPayload(extraction = {}) {
  const rawItems = Array.isArray(extraction.line_items)
    ? extraction.line_items
    : Array.isArray(extraction.items)
      ? extraction.items
      : [];

  let sequence = 0;
  const items = [];
  let discountTotal = 0;

  for (const raw of rawItems) {
    const rawName = normalizeItemName(
      pickFirst(raw.raw_name, raw.name, raw.product, raw.description, raw.item_name)
    );

    const quantity = toPositiveNumber(pickFirst(raw.quantity, raw.qty), 1);
    let unitPrice = toNumber(pickFirst(raw.unit_price, raw.price_per_unit, raw.price_each));
    let totalPrice = toNumber(pickFirst(raw.total_price, raw.total, raw.price, raw.amount));
    const discount = toNumber(raw.discount) || 0;
    const lineConfidence = clamp01(pickFirst(raw.confidence, extraction.confidence, 0.5));
    const barcodeRaw = String(pickFirst(raw.barcode, raw.ean) || '').replace(/[^\d]/g, '');
    const barcode = barcodeRaw.length >= 8 && barcodeRaw.length <= 14 ? barcodeRaw : null;

    if (totalPrice == null && unitPrice != null) {
      totalPrice = Number((unitPrice * quantity).toFixed(2));
    }
    if (unitPrice == null && totalPrice != null && quantity > 0) {
      unitPrice = Number((totalPrice / quantity).toFixed(2));
    }
    if (totalPrice == null && unitPrice == null) {
      continue;
    }

    const lineType = classifyReceiptLine(rawName, totalPrice, raw.line_type);
    if (lineType === 'noise' || lineType === 'summary') {
      continue;
    }

    sequence += 1;
    const parsed = {
      line_number: sequence,
      raw_name: rawName || `Line ${sequence}`,
      normalized_name: normalizeText(rawName),
      quantity: Number(quantity.toFixed(3)),
      unit_price: unitPrice != null ? Number(unitPrice.toFixed(2)) : null,
      total_price: totalPrice != null ? Number(totalPrice.toFixed(2)) : null,
      discount: discount ? Number(discount.toFixed(2)) : 0,
      barcode,
      line_type: lineType,
      confidence: Number(lineConfidence.toFixed(3))
    };

    if (lineType === 'discount' && typeof parsed.total_price === 'number') {
      discountTotal += parsed.total_price;
    }

    items.push(parsed);
  }

  const totalsFromLines = items.reduce((sum, item) => {
    if (typeof item.total_price === 'number') {
      return sum + item.total_price;
    }
    return sum;
  }, 0);

  const subtotal = toNumber(extraction.subtotal);
  const taxTotal = toNumber(pickFirst(extraction.tax_total, extraction.vat_amount));
  const explicitTotal = toNumber(extraction.total);
  const total = explicitTotal != null ? explicitTotal : Number(totalsFromLines.toFixed(2));
  const receiptDateTime = mergeDateAndTime(extraction.receipt_date, extraction.receipt_time);

  return {
    store_name: normalizeItemName(pickFirst(extraction.store_name, extraction.store, extraction.shop)),
    store_address: normalizeItemName(pickFirst(extraction.store_address, extraction.store_location, extraction.address)),
    receipt_date: receiptDateTime,
    receipt_number: normalizeItemName(pickFirst(extraction.receipt_number, extraction.invoice_no)),
    subtotal: subtotal != null ? Number(subtotal.toFixed(2)) : null,
    tax_total: taxTotal != null ? Number(taxTotal.toFixed(2)) : null,
    total: total != null ? Number(total.toFixed(2)) : null,
    discount_total: Number(discountTotal.toFixed(2)),
    currency: String(extraction.currency || 'EUR').toUpperCase(),
    extraction_confidence: Number(clamp01(extraction.confidence || 0.6).toFixed(3)),
    extraction_quality_score: Number(clamp01(extraction.quality_score || extraction.extraction_quality_score || extraction.confidence || 0.6).toFixed(3)),
    line_items: items,
    raw: extraction
  };
}

function normalizeChainName(value) {
  const text = normalizeText(value);
  if (!text) return null;
  for (const entry of CHAIN_SYNONYMS) {
    if (entry.aliases.some((alias) => text.includes(alias))) {
      return entry.canonical;
    }
  }
  return null;
}

async function resolveStoreFromExtraction({ explicitStoreChain, extractedStoreName, extractedStoreAddress }) {
  const preferredChain = normalizeChainName(explicitStoreChain)
    || normalizeChainName(extractedStoreName)
    || normalizeChainName(extractedStoreAddress);

  const rawStore = pickFirst(explicitStoreChain, extractedStoreName, extractedStoreAddress);
  const searchNeedle = normalizeText(pickFirst(extractedStoreName, explicitStoreChain, extractedStoreAddress));

  if (!preferredChain && !searchNeedle) {
    return {
      store_id: null,
      store_chain: null,
      store_raw: rawStore || null,
      city_id: null
    };
  }

  const likePattern = `%${searchNeedle || preferredChain || ''}%`;
  const result = await query(
    `SELECT id, name, chain, city_id
     FROM stores
     WHERE is_active = true
       AND (
         ($1::text IS NOT NULL AND lower(chain) = lower($1))
         OR ($2::text <> '%%' AND (lower(name) LIKE $2 OR lower(chain) LIKE $2))
       )
     ORDER BY
       CASE WHEN $1::text IS NOT NULL AND lower(chain) = lower($1) THEN 0 ELSE 1 END,
       name ASC
     LIMIT 1`,
    [preferredChain, likePattern]
  );

  if (!result.rows.length) {
    return {
      store_id: null,
      store_chain: preferredChain || null,
      store_raw: rawStore || null,
      city_id: null
    };
  }

  const row = result.rows[0];
  return {
    store_id: row.id,
    store_chain: row.chain || preferredChain || null,
    store_raw: rawStore || row.name || null,
    city_id: row.city_id || null
  };
}

function diceCoefficient(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;

  const pairs = (text) => {
    const out = [];
    for (let i = 0; i < text.length - 1; i += 1) out.push(text.slice(i, i + 2));
    return out;
  };

  const aPairs = pairs(a);
  const bPairs = pairs(b);
  const bMap = new Map();
  for (const p of bPairs) {
    bMap.set(p, (bMap.get(p) || 0) + 1);
  }

  let intersection = 0;
  for (const p of aPairs) {
    const count = bMap.get(p) || 0;
    if (count > 0) {
      intersection += 1;
      bMap.set(p, count - 1);
    }
  }
  return (2 * intersection) / (aPairs.length + bPairs.length);
}

function tokenOverlapScore(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0;
  const bSet = new Set(bTokens);
  let common = 0;
  for (const token of aTokens) {
    if (bSet.has(token)) common += 1;
  }
  return common / aTokens.length;
}

async function matchProductFromReceiptLine(item) {
  const barcode = item?.barcode || null;
  const rawName = item?.raw_name || '';
  const normalized = normalizeProductQuery(item?.normalized_name || rawName);
  const normalizedText = normalized.text || normalizeText(item?.normalized_name || rawName);
  const tokens = normalized.tokens.length
    ? normalized.tokens
    : normalizedText.split(' ').filter((t) => t.length >= 3).slice(0, 8);

  if (barcode) {
    const eanMatch = await query(
      `SELECT id, name, brand, ean
       FROM products
       WHERE ean = $1
         AND is_active = true
       LIMIT 1`,
      [barcode]
    );
    if (eanMatch.rows.length) {
      return {
        matched_product_id: eanMatch.rows[0].id,
        match_status: 'matched',
        match_confidence: 0.99,
        candidates: []
      };
    }
  }

  if (!normalizedText || !tokens.length) {
    return {
      matched_product_id: null,
      match_status: 'unmatched',
      match_confidence: 0,
      candidates: []
    };
  }

  const likePatterns = tokens.map((token) => `%${token}%`);
  const rows = await query(
    `SELECT p.id,
            p.name,
            p.brand,
            p.ean,
            pa.normalized_name AS alias_name
     FROM products p
     LEFT JOIN product_aliases pa ON pa.product_id = p.id
     WHERE p.is_active = true
       AND (
         LOWER(p.name) LIKE ANY($1::text[])
         OR COALESCE(pa.normalized_name, '') LIKE ANY($1::text[])
       )
     LIMIT 120`,
    [likePatterns]
  );

  const scoredByProduct = new Map();
  for (const row of rows.rows) {
    const rowNameNorm = normalizeProductQuery(row.name);
    const aliasNorm = normalizeProductQuery(row.alias_name);
    const rowText = rowNameNorm.text || normalizeText(row.name);
    const aliasText = aliasNorm.text || normalizeText(row.alias_name);
    const rowTokens = rowNameNorm.tokens.length
      ? rowNameNorm.tokens
      : rowText.split(' ').filter((t) => t.length >= 3);
    const aliasTokens = aliasNorm.tokens.length
      ? aliasNorm.tokens
      : aliasText.split(' ').filter((t) => t.length >= 3);

    const nameScore = diceCoefficient(normalizedText, rowText);
    const aliasScore = aliasText ? diceCoefficient(normalizedText, aliasText) : 0;
    const overlapName = tokenOverlapScore(tokens, rowTokens);
    const overlapAlias = aliasTokens.length ? tokenOverlapScore(tokens, aliasTokens) : 0;
    const overlap = Math.max(overlapName, overlapAlias);
    const score = Number((Math.max(nameScore, aliasScore) * 0.6 + overlap * 0.4).toFixed(3));

    const prev = scoredByProduct.get(row.id);
    if (!prev || score > prev.score) {
      scoredByProduct.set(row.id, {
        id: row.id,
        name: row.name,
        score,
        overlap: Number(overlap.toFixed(3))
      });
    }
  }

  const ranked = [...scoredByProduct.values()].sort((a, b) => b.score - a.score).slice(0, 5);
  if (!ranked.length) {
    return {
      matched_product_id: null,
      match_status: 'unmatched',
      match_confidence: 0,
      candidates: []
    };
  }

  const best = ranked[0];
  const strongOverlap = best.overlap >= 0.5;
  const mediumOverlap = best.overlap >= 0.35;
  if ((best.score >= 0.78 && mediumOverlap) || (best.score >= 0.68 && strongOverlap)) {
    return {
      matched_product_id: best.id,
      match_status: 'matched',
      match_confidence: best.score,
      candidates: ranked.slice(1, 4).map((candidate) => ({
        product_id: candidate.id,
        product_name: candidate.name,
        score: candidate.score
      }))
    };
  }

  if (best.score >= 0.5) {
    return {
      matched_product_id: null,
      match_status: 'candidates',
      match_confidence: best.score,
      candidates: ranked.slice(0, 4).map((candidate) => ({
        product_id: candidate.id,
        product_name: candidate.name,
        score: candidate.score
      }))
    };
  }

  return {
    matched_product_id: null,
    match_status: 'unmatched',
    match_confidence: best.score,
    candidates: ranked.slice(0, 3).map((candidate) => ({
      product_id: candidate.id,
      product_name: candidate.name,
      score: candidate.score
    }))
  };
}

function computeReceiptConfidence({ extractionConfidence, lines }) {
  const items = Array.isArray(lines) ? lines : [];
  if (!items.length) {
    return Number(clamp01(extractionConfidence).toFixed(3));
  }

  const productLines = items.filter((line) => line.line_type === 'product');
  const effectiveLines = productLines.length ? productLines : items;
  const matchedCount = effectiveLines.filter((line) => line.match_status === 'matched').length;
  const candidateCount = effectiveLines.filter((line) => line.match_status === 'candidates').length;
  const avgLineConfidence = effectiveLines.reduce((sum, line) => sum + clamp01(line.confidence), 0) / effectiveLines.length;

  const matchCoverage = matchedCount / effectiveLines.length;
  const candidateBonus = candidateCount / effectiveLines.length;

  const overall = (clamp01(extractionConfidence) * 0.5)
    + (matchCoverage * 0.4)
    + (Math.min(1, avgLineConfidence + candidateBonus * 0.25) * 0.1);

  return Number(clamp01(overall).toFixed(3));
}

module.exports = {
  normalizeExtractionPayload,
  resolveStoreFromExtraction,
  matchProductFromReceiptLine,
  computeReceiptConfidence,
  normalizeChainName,
  normalizeText
};
