const sharp = require('sharp');
const { extractWithOpenAI, extractWithAnthropic, extractWithTesseract } = require('./providers');

const SUMMARY_TOKENS = [
  'viso', 'total', 'subtotal', 'suma', 'sum', 'moketi', 'mokėta', 'pvm', 'vat',
  'grynieji', 'kortele', 'kortelė', 'cash', 'card', 'change', 'nuolaida kortelei'
];

// Preprocess image for better OCR results
async function preprocessImage(imageBuffer) {
  try {
    const processed = await sharp(imageBuffer)
      .resize(2000, 3000, { fit: 'inside', withoutEnlargement: true })
      .normalize()
      .sharpen()
      .toFormat('jpeg', { quality: 90 })
      .toBuffer();

    return processed;
  } catch (error) {
    console.warn('Image preprocessing failed, using original:', error.message);
    return imageBuffer;
  }
}

// Validate extraction result
function validateExtraction(data) {
  const issues = [];

  if (!data.line_items || !Array.isArray(data.line_items)) {
    issues.push('Missing or invalid line_items');
  }

  if (data.line_items && data.line_items.length === 0) {
    issues.push('No line items extracted');
  }

  data.line_items?.forEach((item, index) => {
    if (!item.raw_name || item.raw_name.trim().length < 2) {
      issues.push(`Line ${index + 1}: Invalid product name`);
    }
  });

  if (data.total !== null && data.total !== undefined && data.total <= 0) {
    issues.push('Invalid total amount');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

function sanitizeExtraction(data = {}) {
  const cleanItems = (Array.isArray(data.line_items) ? data.line_items : [])
    .map((item, index) => ({
      raw_name: String(item?.raw_name || '').trim(),
      quantity: Number(item?.quantity) > 0 ? Number(item.quantity) : 1,
      unit_price: Number.isFinite(Number(item?.unit_price)) ? Number(item.unit_price) : null,
      total_price: Number.isFinite(Number(item?.total_price)) ? Number(item.total_price) : null,
      line_number: Number.isFinite(Number(item?.line_number)) ? Number(item.line_number) : (index + 1),
      barcode: item?.barcode ? String(item.barcode).trim() : null,
      discount: Number.isFinite(Number(item?.discount)) ? Number(item.discount) : null
    }))
    .filter((item) => {
      if (!item.raw_name) return false;
      const name = item.raw_name.toLowerCase();
      const isSummaryLike = SUMMARY_TOKENS.some((token) => name.includes(token));
      const hasAnyPrice = item.total_price != null || item.unit_price != null || item.discount != null;
      // Keep discount rows even if summary-like, but drop obvious non-product summary lines.
      if (isSummaryLike && !hasAnyPrice) return false;
      return true;
    });

  const confidence = Number(data?.confidence);
  const correctedConfidence = Number.isFinite(confidence)
    ? Math.max(0.25, Math.min(0.99, confidence))
    : 0.6;

  return {
    ...data,
    line_items: cleanItems,
    confidence: correctedConfidence
  };
}

// Main extraction with provider cascade
async function extractReceipt(imageBuffer, options = {}) {
  const { provider = 'openai', strictMode = true } = options;

  // Preprocess image
  const processedBuffer = await preprocessImage(imageBuffer);

  // Provider cascade: try in order of preference
  const providers = [
    { name: 'openai', fn: extractWithOpenAI },
    { name: 'anthropic', fn: extractWithAnthropic },
    { name: 'tesseract', fn: extractWithTesseract }
  ];

  // Start with requested provider
  const requestedIndex = providers.findIndex(p => p.name === provider);
  if (requestedIndex > 0) {
    const [requested] = providers.splice(requestedIndex, 1);
    providers.unshift(requested);
  }

  let lastError = null;

  for (const { name, fn } of providers) {
    try {
      console.log(`Trying provider: ${name}`);
      const result = await fn(processedBuffer, options);
      const sanitized = sanitizeExtraction(result.data);
      
      // Validate result
      const validation = validateExtraction(sanitized);
      
      if (strictMode && !validation.valid) {
        console.warn(`Provider ${name} validation failed:`, validation.issues);
        lastError = new Error(`Validation failed: ${validation.issues.join(', ')}`);
        continue;
      }

      console.log(`Successfully extracted with ${name}`);
      return {
        ...result,
        data: sanitized,
        confidence: sanitized.confidence || result.confidence || 0.6
      };
    } catch (error) {
      console.error(`Provider ${name} failed:`, error.message);
      lastError = error;
    }
  }

  throw new Error(`All providers failed. Last error: ${lastError?.message}`);
}

module.exports = {
  extractReceipt,
  preprocessImage,
  validateExtraction
};
