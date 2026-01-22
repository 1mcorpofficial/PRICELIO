const { getClient } = require('./db');

// Normalize product name for matching
function normalizeProductName(name) {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .trim()
    // Remove special characters but keep spaces
    .replace(/[^\w\sąčęėįšųūž]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove common noise words (Lithuanian and English)
    .replace(/\b(su|be|ir|and|with|without|the)\b/g, '')
    .trim();
}

// Extract brand, size, and variant from product name
function parseProductName(name) {
  const normalized = normalizeProductName(name);
  
  // Try to extract size (e.g., "400g", "1kg", "500ml", "1.5l")
  const sizeMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|ct|vnt)/i);
  const size = sizeMatch ? sizeMatch[0] : null;
  
  // Common brand patterns for Lithuanian market
  const brands = ['maxima', 'rimi', 'iki', 'lidl', 'norfa', 'pieno', 'vilkyskiu', 'dziugas'];
  let brand = null;
  
  for (const b of brands) {
    if (normalized.includes(b)) {
      brand = b;
      break;
    }
  }
  
  return {
    normalized,
    brand,
    size,
    tokens: normalized.split(' ').filter(t => t.length > 2)
  };
}

// Calculate similarity score between two strings (Levenshtein-based)
function similarity(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : (1 - distance / maxLen);
}

// Find product by exact name match
async function findProductByName(rawName) {
  const client = await getClient();
  const normalized = normalizeProductName(rawName);
  
  try {
    // Try exact match first
    const exactResult = await client.query(
      `SELECT id, name, brand, variant, pack_size_value, pack_size_unit
       FROM products
       WHERE LOWER(name) = $1 AND is_active = true
       LIMIT 1`,
      [rawName.toLowerCase()]
    );
    
    if (exactResult.rows.length > 0) {
      return exactResult.rows[0];
    }
    
    // Try alias match
    const aliasResult = await client.query(
      `SELECT p.id, p.name, p.brand, p.variant, p.pack_size_value, p.pack_size_unit
       FROM products p
       JOIN product_aliases pa ON pa.product_id = p.id
       WHERE pa.normalized_name = $1 AND p.is_active = true
       ORDER BY pa.confidence DESC
       LIMIT 1`,
      [normalized]
    );
    
    if (aliasResult.rows.length > 0) {
      return aliasResult.rows[0];
    }
    
    return null;
  } catch (error) {
    console.error('findProductByName error:', error);
    return null;
  }
}

// Find product by EAN barcode
async function findProductByEAN(ean) {
  const client = await getClient();
  
  try {
    const result = await client.query(
      `SELECT id, name, brand, variant, pack_size_value, pack_size_unit, ean
       FROM products
       WHERE ean = $1 AND is_active = true
       LIMIT 1`,
      [ean]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('findProductByEAN error:', error);
    return null;
  }
}

// Fuzzy match product by name
async function fuzzyMatchProduct(rawName, limit = 5) {
  const client = await getClient();
  const parsed = parseProductName(rawName);
  
  try {
    // Get candidate products using trigram similarity (requires pg_trgm extension)
    const query = `
      SELECT 
        id, 
        name, 
        brand, 
        variant, 
        pack_size_value, 
        pack_size_unit,
        SIMILARITY(LOWER(name), $1) as name_score
      FROM products
      WHERE 
        is_active = true
        AND (
          LOWER(name) % $1
          OR LOWER(name) LIKE $2
        )
      ORDER BY name_score DESC
      LIMIT $3
    `;
    
    const likePattern = `%${parsed.normalized.split(' ').slice(0, 3).join('%')}%`;
    
    const result = await client.query(query, [
      parsed.normalized,
      likePattern,
      limit * 2
    ]);
    
    // Calculate enhanced scores
    const scored = result.rows.map(product => {
      const productNormalized = normalizeProductName(product.name);
      const productParsed = parseProductName(product.name);
      
      let score = product.name_score || 0;
      
      // Boost score if brand matches
      if (parsed.brand && productParsed.brand === parsed.brand) {
        score += 0.2;
      }
      
      // Boost score if size matches
      if (parsed.size && productParsed.size === parsed.size) {
        score += 0.15;
      }
      
      // Calculate token overlap
      const commonTokens = parsed.tokens.filter(t => 
        productParsed.tokens.includes(t)
      ).length;
      const tokenScore = parsed.tokens.length > 0 
        ? commonTokens / parsed.tokens.length 
        : 0;
      
      score += tokenScore * 0.25;
      
      // Ensure score is between 0 and 1
      score = Math.min(1, Math.max(0, score));
      
      return {
        id: product.id,
        name: product.name,
        brand: product.brand,
        variant: product.variant,
        pack_size_value: product.pack_size_value,
        pack_size_unit: product.pack_size_unit,
        score: Number(score.toFixed(3))
      };
    });
    
    // Sort by score and return top results
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
      
  } catch (error) {
    console.error('fuzzyMatchProduct error:', error);
    
    // Fallback: simple LIKE query
    try {
      const tokens = parsed.tokens.slice(0, 2);
      const likePattern = `%${tokens.join('%')}%`;
      
      const fallbackResult = await client.query(
        `SELECT id, name, brand, variant, pack_size_value, pack_size_unit
         FROM products
         WHERE LOWER(name) LIKE $1 AND is_active = true
         LIMIT $2`,
        [likePattern, limit]
      );
      
      return fallbackResult.rows.map((p, idx) => ({
        ...p,
        score: 0.5 - (idx * 0.1)
      }));
    } catch (fallbackError) {
      console.error('Fallback matching also failed:', fallbackError);
      return [];
    }
  }
}

// Learn new alias from confirmed matches
async function learnProductAlias(rawName, productId, sourceType = 'receipt', confidence = 0.9) {
  const client = await getClient();
  const normalized = normalizeProductName(rawName);
  
  try {
    await client.query(
      `INSERT INTO product_aliases (raw_name, normalized_name, product_id, source_type, confidence)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [rawName, normalized, productId, sourceType, confidence]
    );
    
    return true;
  } catch (error) {
    console.error('learnProductAlias error:', error);
    return false;
  }
}

module.exports = {
  normalizeProductName,
  parseProductName,
  similarity,
  findProductByName,
  findProductByEAN,
  fuzzyMatchProduct,
  learnProductAlias
};
