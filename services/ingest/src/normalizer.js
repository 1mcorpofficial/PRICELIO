// Normalize price values
function normalizePrice(price) {
  if (typeof price === 'number') {
    return Number(price.toFixed(2));
  }
  
  if (typeof price === 'string') {
    // Remove currency symbols and whitespace
    const cleaned = price.replace(/[€$\s]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : Number(parsed.toFixed(2));
  }
  
  return null;
}

// Normalize units (kg, g, l, ml, etc.)
function normalizeUnit(unit) {
  if (!unit) return null;
  
  const normalized = unit.toLowerCase().trim();
  
  const unitMap = {
    'kg': 'kg',
    'kilogram': 'kg',
    'g': 'g',
    'gram': 'g',
    'l': 'l',
    'liter': 'l',
    'litre': 'l',
    'ml': 'ml',
    'ct': 'ct',
    'vnt': 'ct',
    'pcs': 'ct',
    'pc': 'ct'
  };
  
  return unitMap[normalized] || normalized;
}

// Parse validity dates from various formats
function parseValidityDates(text) {
  // This is a simplified parser
  // Real implementation would handle multiple date formats
  
  const result = {
    valid_from: null,
    valid_to: null
  };
  
  // Example: "Valid 20.01 - 26.01"
  const rangeMatch = text.match(/(\d{2})\.(\d{2})\s*-\s*(\d{2})\.(\d{2})/);
  if (rangeMatch) {
    const year = new Date().getFullYear();
    result.valid_from = `${year}-${rangeMatch[2]}-${rangeMatch[1]}`;
    result.valid_to = `${year}-${rangeMatch[4]}-${rangeMatch[3]}`;
  }
  
  return result;
}

// Normalize product name (remove extra whitespace, standardize format)
function normalizeProductName(name) {
  if (!name) return '';
  
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ');
}

// Extract category from product name or metadata
function extractCategory(productName, metadata = {}) {
  const name = productName.toLowerCase();
  
  // Simple keyword-based categorization
  if (name.includes('milk') || name.includes('yogurt') || name.includes('cheese') || 
      name.includes('pienas') || name.includes('jogurtas') || name.includes('sūris')) {
    return 'Dairy';
  }
  
  if (name.includes('bread') || name.includes('duona')) {
    return 'Bakery';
  }
  
  if (name.includes('coffee') || name.includes('tea') || name.includes('kava') || name.includes('arbata')) {
    return 'Beverages';
  }
  
  if (name.includes('chicken') || name.includes('beef') || name.includes('pork') || name.includes('fish') ||
      name.includes('vištiena') || name.includes('jautiena') || name.includes('kiauliena') || name.includes('žuvis')) {
    return 'Meat & Fish';
  }
  
  if (name.includes('apple') || name.includes('banana') || name.includes('orange') ||
      name.includes('obuolys') || name.includes('bananas') || name.includes('apelsinas')) {
    return 'Fruits';
  }
  
  if (name.includes('potato') || name.includes('carrot') || name.includes('tomato') ||
      name.includes('bulvė') || name.includes('morka') || name.includes('pomidoras')) {
    return 'Vegetables';
  }
  
  return 'Other';
}

// Validate offer data quality
function validateOffer(offer) {
  const issues = [];
  
  if (!offer.product_name || offer.product_name.trim().length < 2) {
    issues.push('Invalid product name');
  }
  
  if (!offer.price_value || offer.price_value <= 0) {
    issues.push('Invalid price');
  }
  
  if (offer.old_price_value && offer.old_price_value <= offer.price_value) {
    issues.push('Old price should be higher than current price');
  }
  
  if (offer.discount_percent && (offer.discount_percent < 0 || offer.discount_percent > 100)) {
    issues.push('Invalid discount percentage');
  }
  
  // Validate dates
  if (offer.valid_from && offer.valid_to) {
    const from = new Date(offer.valid_from);
    const to = new Date(offer.valid_to);
    
    if (to < from) {
      issues.push('valid_to must be after valid_from');
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

module.exports = {
  normalizePrice,
  normalizeUnit,
  parseValidityDates,
  normalizeProductName,
  extractCategory,
  validateOffer
};
