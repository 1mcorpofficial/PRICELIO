const sharp = require('sharp');
const { extractWithOpenAI, extractWithAnthropic, extractWithTesseract } = require('./providers');

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
      
      // Validate result
      const validation = validateExtraction(result.data);
      
      if (strictMode && !validation.valid) {
        console.warn(`Provider ${name} validation failed:`, validation.issues);
        lastError = new Error(`Validation failed: ${validation.issues.join(', ')}`);
        continue;
      }

      console.log(`Successfully extracted with ${name}`);
      return result;
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
