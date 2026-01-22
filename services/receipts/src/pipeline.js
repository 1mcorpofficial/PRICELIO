const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { findProductByName, findProductByEAN, fuzzyMatchProduct } = require('./matcher');

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:3001';

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
      store_location: extraction.store_location,
      receipt_date: extraction.receipt_date,
      receipt_time: extraction.receipt_time,
      line_items: extraction.line_items || [],
      subtotal: extraction.subtotal,
      tax_total: extraction.tax_total,
      total: extraction.total,
      currency: extraction.currency || 'EUR',
      extraction_confidence: extraction.confidence || 0.0,
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

function scoreConfidence(lines) {
  if (!lines.length) {
    return { receipt_confidence: 0.0 };
  }

  const extractionConfidences = lines.map(l => l.confidence || 0.5);
  const matchConfidences = lines.map(l => l.match_confidence || 0.0);
  
  const avgExtraction = extractionConfidences.reduce((sum, c) => sum + c, 0) / lines.length;
  const avgMatch = matchConfidences.reduce((sum, c) => sum + c, 0) / lines.length;
  
  // Weighted average: 60% extraction, 40% matching
  const overall = (avgExtraction * 0.6) + (avgMatch * 0.4);

  return { 
    receipt_confidence: Number(overall.toFixed(3)),
    extraction_confidence: Number(avgExtraction.toFixed(3)),
    matching_confidence: Number(avgMatch.toFixed(3))
  };
}

function buildReport(lines) {
  const overpaidItems = [];
  let savingsTotal = 0;
  let verifiedCount = 0;

  lines.forEach(line => {
    if (line.match_status === 'matched' && line.match_confidence >= 0.8) {
      verifiedCount++;
    }

    // TODO: Compare with current offers to find overpaid items
    // This requires querying the offers table
  });

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
