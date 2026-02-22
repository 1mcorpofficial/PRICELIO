const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { findProductByName, findProductByEAN, fuzzyMatchProduct } = require('./matcher');
const { query } = require('./db');

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://127.0.0.1:3001';

function validateUpload(meta) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  
  const issues = [];
  
  if (meta.file_size > maxSize) {
    issues.push('file_too_large');
  }
  
  if (!allowedMimeTypes.includes(meta.mime_type)) {
    issues.push('invalid_file_type');
  }

  return {
    ok: issues.length === 0,
    reasons: issues,
    normalized: {
      file_size: meta.file_size || 0,
      mime_type: meta.mime_type || 'image/jpeg'
    }
  };
}

async function runExtraction(imagePath) {
  try {
    // Read image file
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Prepare form data
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: path.basename(imagePath),
      contentType: 'image/jpeg'
    });
    formData.append('language', 'lt');
    formData.append('strict_mode', 'true');
    formData.append('scan_mode', 'full_receipt');
    formData.append('min_quality_score', String(process.env.RECEIPT_SCAN_MIN_QUALITY || 0.65));

    // Call AI Gateway
    const response = await axios.post(`${AI_GATEWAY_URL}/extract/receipt`, formData, {
      headers: formData.getHeaders(),
      timeout: 35000
    });

    if (!response.data.success) {
      throw new Error('Extraction failed');
    }

    const extraction = response.data.extraction;

    return {
      store: extraction.store_name,
      store_location: extraction.store_address || extraction.store_location,
      receipt_date: extraction.receipt_date,
      receipt_time: extraction.receipt_time,
      line_items: extraction.line_items || [],
      subtotal: extraction.subtotal,
      tax_total: extraction.tax_total ?? extraction.vat_amount ?? null,
      total: extraction.total,
      currency: extraction.currency || 'EUR',
      extraction_confidence: extraction.confidence || 0.0,
      extraction_quality_score: extraction.quality_score || extraction.confidence || 0.0,
      provider: response.data.provider,
      processing_time_ms: response.data.processing_time_ms
    };
  } catch (error) {
    console.error('AI extraction failed:', error.message);
    
    // Return minimal structure on failure
    return {
      store: null,
      store_location: null,
      receipt_date: null,
      receipt_time: null,
      line_items: [],
      subtotal: null,
      tax_total: null,
      total: null,
      currency: 'EUR',
      extraction_confidence: 0.0,
      extraction_quality_score: 0.0,
      provider: 'fallback',
      error: error.message
    };
  }
}

async function matchProducts(lines) {
  const matched = [];

  for (const line of lines) {
    let matchResult = {
      ...line,
      matched_product_id: null,
      match_status: 'unmatched',
      match_confidence: 0.0,
      candidates: []
    };

    // Discount rows are not products and should not be matched against catalog.
    if (String(line?.line_type || '').toLowerCase() === 'discount') {
      matched.push(matchResult);
      continue;
    }

    try {
      // Try exact name match first
      let product = await findProductByName(line.raw_name);
      
      if (product) {
        matchResult.matched_product_id = product.id;
        matchResult.match_status = 'matched';
        matchResult.match_confidence = 0.95;
      } else {
        // Try fuzzy match
        const fuzzyResults = await fuzzyMatchProduct(line.raw_name);
        
        if (fuzzyResults.length > 0) {
          const bestMatch = fuzzyResults[0];
          
          if (bestMatch.score >= 0.8) {
            // High confidence match
            matchResult.matched_product_id = bestMatch.id;
            matchResult.match_status = 'matched';
            matchResult.match_confidence = bestMatch.score;
          } else if (bestMatch.score >= 0.6) {
            // Medium confidence - provide candidates
            matchResult.match_status = 'candidates';
            matchResult.candidates = fuzzyResults.slice(0, 3).map(r => ({
              product_id: r.id,
              product_name: r.name,
              score: r.score
            }));
            matchResult.match_confidence = bestMatch.score;
          }
        }
      }
    } catch (error) {
      console.error(`Matching failed for "${line.raw_name}":`, error.message);
    }

    matched.push(matchResult);
  }

  return matched;
}

function scoreConfidence(lines, extractionMeta = {}) {
  if (!lines.length) {
    return { receipt_confidence: 0.0 };
  }

  const effectiveLines = lines.filter(
    (line) => String(line?.line_type || '').toLowerCase() !== 'discount'
  );
  const sourceLines = effectiveLines.length ? effectiveLines : lines;

  const extractionBase = Number(extractionMeta.extraction_quality_score ?? extractionMeta.extraction_confidence);
  const extractionConfidences = sourceLines.map((line) => {
    if (line.confidence != null) return Number(line.confidence) || 0.5;
    return Number.isFinite(extractionBase) ? extractionBase : 0.5;
  });
  const matchConfidences = sourceLines.map((line) => line.match_confidence || 0.0);
  
  const avgExtraction = extractionConfidences.reduce((sum, c) => sum + c, 0) / sourceLines.length;
  const avgMatch = matchConfidences.reduce((sum, c) => sum + c, 0) / sourceLines.length;
  
  // Weighted average: 60% extraction, 40% matching
  const overall = (avgExtraction * 0.6) + (avgMatch * 0.4);

  return {
    receipt_confidence: Number(overall.toFixed(3)),
    extraction_confidence: Number(avgExtraction.toFixed(3)),
    matching_confidence: Number(avgMatch.toFixed(3))
  };
}

async function buildReport(lines) {
  const overpaidItems = [];
  let savingsTotal = 0;
  let verifiedCount = 0;

  for (const line of lines) {
    if (line.match_status === 'matched' && line.match_confidence >= 0.8) {
      verifiedCount++;
    }

    if (!line.matched_product_id || line.total_price == null) {
      continue;
    }

    try {
      const bestOffer = await query(
        `SELECT price_value, old_price_value, store_chain, valid_to
         FROM offers
         WHERE product_id = $1
           AND status = 'active'
           AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
         ORDER BY price_value ASC
         LIMIT 1`,
        [line.matched_product_id]
      );

      if (bestOffer.rows.length === 0) {
        continue;
      }

      const offer = bestOffer.rows[0];
      const paid = Number(line.total_price);
      const best = Number(offer.price_value);

      if (paid > best) {
        const savings = Number((paid - best).toFixed(2));
        savingsTotal += savings;
        overpaidItems.push({
          product_id: line.matched_product_id,
          product_name: line.normalized_name || line.raw_name,
          paid_price: paid,
          best_offer_price: best,
          old_price: offer.old_price_value != null ? Number(offer.old_price_value) : null,
          store_chain: offer.store_chain || null,
          valid_to: offer.valid_to || null,
          savings_eur: savings,
          savings_percent: Number((((paid - best) / paid) * 100).toFixed(1))
        });
      }
    } catch (error) {
      console.error('buildReport offer comparison failed:', error.message);
    }
  }

  const verifiedRatio = lines.length > 0 
    ? Number((verifiedCount / lines.length).toFixed(2))
    : 0;

  return {
    overpaid_items: overpaidItems,
    savings_total: savingsTotal,
    verified_ratio: verifiedRatio,
    total_lines: lines.length,
    verified_lines: verifiedCount
  };
}

module.exports = {
  validateUpload,
  runExtraction,
  matchProducts,
  scoreConfidence,
  buildReport
};
