const sharp = require('sharp');
const { extractWithOpenAI, extractWithAnthropic, extractWithTesseract } = require('./providers');

const SUMMARY_TOKENS = [
  'viso', 'total', 'subtotal', 'suma', 'sum', 'moketi', 'mokėta', 'pvm', 'vat',
  'grynieji', 'kortele', 'kortelė', 'cash', 'card', 'change', 'graza', 'grąža',
  'atsiskaitymas', 'terminal', 'cekis', 'čekis', 'kvitas'
];
const DISCOUNT_TOKENS = ['nuolaida', 'akcija', 'discount', 'kuponas', 'coupon', 'sutaup'];
const HEADER_NOISE_TOKENS = ['pardavejas', 'kasa', 'kasinink', 'aciu', 'ačiū', 'www', 'http'];
const HAS_LETTER_PATTERN = /\p{L}/u;
const MOSTLY_NUMERIC_PATTERN = /^[\d\s.,:/\-+*x€%]+$/i;

const QUALITY_ACCEPTANCE_SCORE = Number(process.env.RECEIPT_QUALITY_ACCEPTANCE_SCORE || 0.67);
const QUALITY_MIN_VALID_SCORE = Number(process.env.RECEIPT_QUALITY_MIN_VALID_SCORE || 0.42);

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function numericOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/[€\s]/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeLineType(inputType, rawName, totalPrice) {
  const explicit = String(inputType || '').trim().toLowerCase();
  if (['product', 'discount', 'summary', 'noise', 'unknown'].includes(explicit)) {
    return explicit;
  }

  const name = normalizeText(rawName);
  if (!name) return 'noise';
  if (DISCOUNT_TOKENS.some((token) => name.includes(token))) return 'discount';
  if (typeof totalPrice === 'number' && totalPrice < 0) return 'discount';
  if (SUMMARY_TOKENS.some((token) => name.includes(token))) return 'summary';
  if (HEADER_NOISE_TOKENS.some((token) => name.includes(token))) return 'noise';
  if (!HAS_LETTER_PATTERN.test(String(rawName || '')) && MOSTLY_NUMERIC_PATTERN.test(String(rawName || ''))) {
    return 'noise';
  }
  return 'product';
}

// Preprocess image for better OCR results.
async function preprocessImage(imageBuffer) {
  try {
    const processed = await sharp(imageBuffer)
      .resize(2200, 3400, { fit: 'inside', withoutEnlargement: true })
      .normalize()
      .sharpen()
      .toFormat('jpeg', { quality: 92 })
      .toBuffer();

    return processed;
  } catch (error) {
    console.warn('Image preprocessing failed, using original:', error.message);
    return imageBuffer;
  }
}

function sanitizeExtraction(data = {}, options = {}) {
  const sourceItems = Array.isArray(data.line_items) ? data.line_items : [];
  const cleanedItems = [];

  for (let index = 0; index < sourceItems.length; index += 1) {
    const raw = sourceItems[index] || {};
    const rawName = String(raw.raw_name || raw.name || raw.item_name || '').replace(/\s+/g, ' ').trim();
    const quantity = Math.max(0.001, Math.min(9999, Number(raw.quantity) > 0 ? Number(raw.quantity) : 1));
    let unitPrice = numericOrNull(raw.unit_price);
    let totalPrice = numericOrNull(raw.total_price);
    let discount = numericOrNull(raw.discount);
    const barcode = raw.barcode ? String(raw.barcode).replace(/[^\d]/g, '').trim() : null;
    const lineType = normalizeLineType(raw.line_type, rawName, totalPrice);
    const lineConfidence = clamp01(raw.confidence ?? data.confidence ?? 0.6);

    if (totalPrice == null && unitPrice != null) {
      totalPrice = Number((unitPrice * quantity).toFixed(2));
    }
    if (unitPrice == null && totalPrice != null && quantity > 0) {
      unitPrice = Number((totalPrice / quantity).toFixed(2));
    }

    // Discount rows should reduce total if sign was lost in OCR.
    if (lineType === 'discount' && totalPrice != null && totalPrice > 0) {
      totalPrice = Number((-Math.abs(totalPrice)).toFixed(2));
    }
    if (lineType === 'discount' && discount == null && totalPrice != null) {
      discount = Number(Math.abs(totalPrice).toFixed(2));
    }

    const hasAnyPrice = totalPrice != null || unitPrice != null || discount != null;
    const hasLetters = HAS_LETTER_PATTERN.test(rawName);
    const numericNoise = rawName && MOSTLY_NUMERIC_PATTERN.test(rawName);

    if (lineType === 'summary' || lineType === 'noise') continue;
    if (!hasAnyPrice) continue;
    if (!rawName && !barcode) continue;
    if (!hasLetters && numericNoise && !barcode) continue;

    cleanedItems.push({
      line_type: lineType === 'unknown' ? 'product' : lineType,
      raw_name: rawName || `Line ${index + 1}`,
      quantity: Number(quantity.toFixed(3)),
      unit_price: unitPrice != null ? Number(unitPrice.toFixed(2)) : null,
      total_price: totalPrice != null ? Number(totalPrice.toFixed(2)) : null,
      line_number: Number.isFinite(Number(raw.line_number)) ? Number(raw.line_number) : (index + 1),
      barcode: barcode && barcode.length >= 8 && barcode.length <= 14 ? barcode : null,
      discount: discount != null ? Number(discount.toFixed(2)) : null,
      confidence: Number(lineConfidence.toFixed(3))
    });
  }

  const confidence = clamp01(data.confidence ?? 0.6);
  const qualityFlags = Array.isArray(data.quality_flags)
    ? data.quality_flags.map((value) => String(value).trim()).filter(Boolean)
    : [];

  return {
    ...data,
    scan_mode: String(data.scan_mode || options.scanMode || 'full_receipt'),
    store_name: data.store_name ? String(data.store_name).trim() : null,
    store_address: (data.store_address || data.store_location)
      ? String(data.store_address || data.store_location).trim()
      : null,
    receipt_date: data.receipt_date || null,
    receipt_time: data.receipt_time || null,
    subtotal: numericOrNull(data.subtotal),
    vat_amount: numericOrNull(data.vat_amount ?? data.tax_total),
    total: numericOrNull(data.total),
    currency: String(data.currency || 'EUR').toUpperCase(),
    line_items: cleanedItems,
    quality_flags: qualityFlags,
    confidence: Number(confidence.toFixed(3))
  };
}

function evaluateExtractionQuality(data = {}) {
  const items = Array.isArray(data.line_items) ? data.line_items : [];
  const productItems = items.filter((item) => item.line_type !== 'discount');
  const pricedItems = items.filter((item) => item.total_price != null || item.unit_price != null);
  const declaredTotal = numericOrNull(data.total);
  const lineItemsTotal = Number(pricedItems.reduce((sum, item) => {
    if (item.total_price != null) return sum + Number(item.total_price);
    if (item.unit_price != null) return sum + Number(item.unit_price) * Number(item.quantity || 1);
    return sum;
  }, 0).toFixed(2));

  const flags = new Set(Array.isArray(data.quality_flags) ? data.quality_flags : []);
  if (!productItems.length) flags.add('no_product_lines');
  if (!pricedItems.length) flags.add('no_priced_lines');
  if (!data.store_name) flags.add('missing_store');
  if (!data.receipt_date) flags.add('missing_receipt_date');
  if (declaredTotal == null) flags.add('missing_total');

  let totalDiff = null;
  if (declaredTotal != null && lineItemsTotal > 0) {
    totalDiff = Number(Math.abs(declaredTotal - lineItemsTotal).toFixed(2));
    const tolerance = Math.max(0.9, declaredTotal * 0.12);
    if (totalDiff > tolerance) {
      flags.add('line_sum_mismatch');
    }
  }

  let score = 0;
  score += Math.min(0.36, productItems.length * 0.08);
  score += declaredTotal != null ? 0.2 : 0.04;
  score += data.store_name ? 0.1 : 0;
  score += data.receipt_date ? 0.1 : 0;
  score += pricedItems.length ? 0.08 : 0;
  if (declaredTotal != null && lineItemsTotal > 0) {
    score += flags.has('line_sum_mismatch') ? 0.02 : 0.16;
  } else if (lineItemsTotal > 0) {
    score += 0.08;
  }
  score += clamp01(data.confidence) * 0.16;

  return {
    qualityScore: Number(clamp01(score).toFixed(3)),
    qualityFlags: [...flags],
    declaredTotal,
    lineItemsTotal,
    totalDiff
  };
}

function validateExtraction(data = {}) {
  const issues = [];

  if (!Array.isArray(data.line_items)) {
    issues.push('Missing or invalid line_items');
  } else if (!data.line_items.length) {
    issues.push('No line items extracted');
  }

  data.line_items?.forEach((item, index) => {
    if (!item.raw_name || item.raw_name.trim().length < 2) {
      issues.push(`Line ${index + 1}: invalid product name`);
    }
    const isDiscount = String(item.line_type || '').toLowerCase() === 'discount';
    if (item.total_price == null && item.unit_price == null && !(isDiscount && item.discount != null)) {
      issues.push(`Line ${index + 1}: missing prices`);
    }
  });

  const quality = evaluateExtractionQuality(data);
  if (quality.qualityScore < QUALITY_MIN_VALID_SCORE) {
    issues.push(`Low extraction quality (${quality.qualityScore})`);
  }

  return {
    valid: issues.length === 0,
    issues,
    quality
  };
}

// Main extraction with provider cascade and quality-based selection.
async function extractReceipt(imageBuffer, options = {}) {
  const {
    provider = 'openai',
    strictMode = true,
    scanMode = 'full_receipt',
    minQualityScore = QUALITY_ACCEPTANCE_SCORE
  } = options;

  const processedBuffer = await preprocessImage(imageBuffer);

  const providers = [
    { name: 'openai', fn: extractWithOpenAI },
    { name: 'anthropic', fn: extractWithAnthropic },
    { name: 'tesseract', fn: extractWithTesseract }
  ];

  const requestedIndex = providers.findIndex((entry) => entry.name === provider);
  if (requestedIndex > 0) {
    const [requested] = providers.splice(requestedIndex, 1);
    providers.unshift(requested);
  }

  let bestCandidate = null;
  let lastError = null;

  for (const { name, fn } of providers) {
    const candidateBuffers = name === 'openai'
      ? [processedBuffer, imageBuffer]
      : [processedBuffer];

    for (let attempt = 0; attempt < candidateBuffers.length; attempt += 1) {
      try {
        console.log(`Trying provider: ${name} (attempt ${attempt + 1}/${candidateBuffers.length})`);
        const result = await fn(candidateBuffers[attempt], { ...options, scanMode });
        const sanitized = sanitizeExtraction(result.data, { scanMode });
        const validation = validateExtraction(sanitized);
        const quality = validation.quality;

        sanitized.quality_score = quality.qualityScore;
        sanitized.quality_flags = quality.qualityFlags;
        sanitized.quality_metrics = {
          declared_total: quality.declaredTotal,
          line_items_total: quality.lineItemsTotal,
          total_diff: quality.totalDiff
        };

        if (strictMode && !validation.valid) {
          console.warn(`Provider ${name} validation failed:`, validation.issues);
          lastError = new Error(`Validation failed: ${validation.issues.join(', ')}`);
          continue;
        }

        const compositeScore = Number((quality.qualityScore * 0.7 + clamp01(sanitized.confidence) * 0.3).toFixed(3));
        const candidate = {
          ...result,
          data: sanitized,
          confidence: Number(clamp01(sanitized.confidence).toFixed(3)),
          qualityScore: quality.qualityScore,
          compositeScore
        };

        if (!bestCandidate || candidate.compositeScore > bestCandidate.compositeScore) {
          bestCandidate = candidate;
        }

        if (quality.qualityScore >= minQualityScore) {
          console.log(`Accepted extraction from ${name} with quality ${quality.qualityScore}`);
          return {
            provider: candidate.provider,
            data: candidate.data,
            confidence: candidate.confidence,
            processingTime: candidate.processingTime
          };
        }

        console.warn(
          `Provider ${name} quality low (${quality.qualityScore}); trying next provider for better extraction`
        );
      } catch (error) {
        console.error(`Provider ${name} failed:`, error.message);
        lastError = error;
      }
    }
  }

  if (bestCandidate) {
    console.warn(
      `Returning best available extraction with quality ${bestCandidate.qualityScore} after provider cascade`
    );
    return {
      provider: bestCandidate.provider,
      data: bestCandidate.data,
      confidence: bestCandidate.confidence,
      processingTime: bestCandidate.processingTime
    };
  }

  throw new Error(`All providers failed. Last error: ${lastError?.message}`);
}

module.exports = {
  extractReceipt,
  preprocessImage,
  validateExtraction,
  sanitizeExtraction,
  evaluateExtractionQuality
};
