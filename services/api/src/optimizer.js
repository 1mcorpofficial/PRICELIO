const { query, getClient } = require('./db');

function toDealSummary(row, quantity) {
  const oldPrice = row.old_price_value || row.price_value;
  const savings = Number((oldPrice - row.price_value).toFixed(2));
  const percent = oldPrice > 0 ? Number(((savings / oldPrice) * 100).toFixed(1)) : 0;
  return {
    product_id: row.product_id,
    product_name: row.product_name,
    price: Number(row.price_value),
    old_price: row.old_price_value ? Number(row.old_price_value) : null,
    source: row.source_type.toUpperCase(),
    valid_to: row.valid_to,
    savings_eur: savings,
    savings_percent: percent,
    verified: row.is_verified,
    quantity: quantity || 1,
    line_total: Number((Number(row.price_value) * (quantity || 1)).toFixed(2)),
    median_receipt_price: row.median_receipt_price || null
  };
}

// Calculate Haversine distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Get median receipt price for comparison
async function getMedianReceiptPrice(productId, cityId = null) {
  let sql = `
    SELECT 
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY unit_price) as median_price,
      COUNT(*) as sample_count
    FROM receipt_items ri
    JOIN receipts r ON r.id = ri.receipt_id
    WHERE 
      ri.matched_product_id = $1
      AND r.status IN ('processed', 'finalized')
      AND r.receipt_date >= CURRENT_DATE - INTERVAL '30 days'
  `;
  
  const params = [productId];
  
  if (cityId) {
    sql += ` AND r.store_id IN (SELECT id FROM stores WHERE city_id = $2)`;
    params.push(cityId);
  }
  
  const result = await query(sql, params);
  
  if (result.rows.length > 0 && result.rows[0].median_price) {
    return {
      median_price: parseFloat(result.rows[0].median_price),
      sample_count: parseInt(result.rows[0].sample_count)
    };
  }
  
  return null;
}

async function optimizeSingleStore(basketItems) {
  const productItems = basketItems.filter((item) => item.product_id);
  const missingItems = basketItems.filter((item) => !item.product_id);

  if (!productItems.length) {
    return {
      total_price: 0,
      savings_eur: 0,
      plan: [],
      missing_items: missingItems.map((item) => item.raw_name || 'Unknown item')
    };
  }

  const productIds = productItems.map((item) => item.product_id);
  const offers = await query(
    `SELECT o.product_id,
            o.price_value,
            o.old_price_value,
            o.source_type,
            o.valid_to,
            o.is_verified,
            o.store_id,
            s.name AS store_name,
            p.name AS product_name
     FROM offers o
     JOIN stores s ON s.id = o.store_id
     JOIN products p ON p.id = o.product_id
     WHERE o.product_id = ANY($1::uuid[])
       AND o.status = 'active'`,
    [productIds]
  );

  const storeMap = new Map();
  offers.rows.forEach((row) => {
    const storeEntry = storeMap.get(row.store_id) || {
      store_id: row.store_id,
      store_name: row.store_name,
      items: new Map()
    };

    const existing = storeEntry.items.get(row.product_id);
    if (!existing || Number(row.price_value) < existing.price_value) {
      storeEntry.items.set(row.product_id, row);
    }

    storeMap.set(row.store_id, storeEntry);
  });

  if (!storeMap.size) {
    return {
      total_price: 0,
      savings_eur: 0,
      plan: [],
      missing_items: productItems.map((item) => item.product_name || item.raw_name || 'Unknown item')
    };
  }

  let bestStore = null;
  storeMap.forEach((store) => {
    let coverage = 0;
    let total = 0;
    productItems.forEach((item) => {
      const offer = store.items.get(item.product_id);
      if (offer) {
        coverage += 1;
        total += Number(offer.price_value) * (item.quantity || 1);
      }
    });

    const candidate = { ...store, coverage, total: Number(total.toFixed(2)) };
    if (!bestStore) {
      bestStore = candidate;
      return;
    }

    if (candidate.coverage > bestStore.coverage) {
      bestStore = candidate;
      return;
    }

    if (candidate.coverage === bestStore.coverage && candidate.total < bestStore.total) {
      bestStore = candidate;
    }
  });

  const planItems = [];
  const missing = [...missingItems.map((item) => item.raw_name || 'Unknown item')];

  // Enrich items with median receipt prices
  for (const item of productItems) {
    const offer = bestStore.items.get(item.product_id);
    if (!offer) {
      missing.push(item.product_name || item.raw_name || 'Unknown item');
      continue;
    }
    
    // Get median price from recent receipts
    const medianData = await getMedianReceiptPrice(item.product_id);
    if (medianData) {
      offer.median_receipt_price = medianData.median_price;
      offer.median_sample_count = medianData.sample_count;
    }
    
    planItems.push(toDealSummary(offer, item.quantity));
  }

  const totalPrice = planItems.reduce((sum, item) => sum + item.line_total, 0);
  
  // Calculate potential savings vs median receipt prices
  const medianTotal = planItems.reduce((sum, item) => {
    return sum + ((item.median_receipt_price || item.price) * item.quantity);
  }, 0);
  
  const savingsVsMedian = Math.max(0, medianTotal - totalPrice);

  return {
    total_price: Number(totalPrice.toFixed(2)),
    savings_eur: Number(savingsVsMedian.toFixed(2)),
    plan: [
      {
        store_id: bestStore.store_id,
        store_name: bestStore.store_name,
        items: planItems,
        coverage: bestStore.coverage,
        total_items: productItems.length
      }
    ],
    missing_items: missing,
    comparison_note: savingsVsMedian > 0 
      ? `You save €${savingsVsMedian.toFixed(2)} vs recent median prices`
      : null
  };
}

// Optimize for two stores with travel cost consideration
async function optimizeTwoStores(basketItems, options = {}) {
  const { 
    user_location = { lat: 54.6872, lon: 25.2797 }, // Default Vilnius center
    travel_cost_per_km = 0.5,
    max_travel_distance = 10 // Max 10km total travel
  } = options;
  
  // Get single store baseline
  const singleStorePlan = await optimizeSingleStore(basketItems);
  
  if (!singleStorePlan.plan.length || basketItems.length < 3) {
    return {
      ...singleStorePlan,
      store_count: 1,
      optimization_note: 'Single store is optimal for this basket'
    };
  }
  
  const productItems = basketItems.filter((item) => item.product_id);
  const productIds = productItems.map((item) => item.product_id);
  
  // Get all offers with store locations
  const offers = await query(
    `SELECT o.product_id,
            o.price_value,
            o.old_price_value,
            o.source_type,
            o.valid_to,
            o.is_verified,
            o.store_id,
            s.name AS store_name,
            s.lat,
            s.lon,
            p.name AS product_name
     FROM offers o
     JOIN stores s ON s.id = o.store_id
     JOIN products p ON p.id = o.product_id
     WHERE o.product_id = ANY($1::uuid[])
       AND o.status = 'active'
       AND s.lat IS NOT NULL
       AND s.lon IS NOT NULL`,
    [productIds]
  );
  
  // Build store map with locations
  const storeMap = new Map();
  offers.rows.forEach((row) => {
    if (!storeMap.has(row.store_id)) {
      storeMap.set(row.store_id, {
        store_id: row.store_id,
        store_name: row.store_name,
        lat: row.lat,
        lon: row.lon,
        items: new Map()
      });
    }
    
    const store = storeMap.get(row.store_id);
    const existing = store.items.get(row.product_id);
    
    if (!existing || Number(row.price_value) < existing.price_value) {
      store.items.set(row.product_id, row);
    }
  });
  
  if (storeMap.size < 2) {
    return {
      ...singleStorePlan,
      store_count: 1,
      optimization_note: 'Not enough stores for 2-store optimization'
    };
  }
  
  // Try all store pairs
  let bestPlan = null;
  let bestTotalCost = singleStorePlan.total_price;
  
  const stores = Array.from(storeMap.values());
  
  for (let i = 0; i < stores.length; i++) {
    for (let j = i + 1; j < stores.length; j++) {
      const store1 = stores[i];
      const store2 = stores[j];
      
      // Calculate travel distances
      const distToStore1 = calculateDistance(
        user_location.lat, 
        user_location.lon,
        store1.lat,
        store1.lon
      );
      
      const distToStore2 = calculateDistance(
        user_location.lat,
        user_location.lon,
        store2.lat,
        store2.lon
      );
      
      const distBetweenStores = calculateDistance(
        store1.lat,
        store1.lon,
        store2.lat,
        store2.lon
      );
      
      const totalTravelDist = distToStore1 + distBetweenStores + distToStore2;
      
      // Skip if travel is too far
      if (totalTravelDist > max_travel_distance) {
        continue;
      }
      
      const travelCost = totalTravelDist * travel_cost_per_km;
      
      // Partition items optimally between stores
      const store1Items = [];
      const store2Items = [];
      let basketCost = 0;
      
      for (const item of productItems) {
        const offer1 = store1.items.get(item.product_id);
        const offer2 = store2.items.get(item.product_id);
        
        if (!offer1 && !offer2) {
          continue; // Item not available
        }
        
        // Choose cheaper store for this item
        if (!offer2 || (offer1 && Number(offer1.price_value) <= Number(offer2.price_value))) {
          store1Items.push({ offer: offer1, quantity: item.quantity || 1 });
          basketCost += Number(offer1.price_value) * (item.quantity || 1);
        } else {
          store2Items.push({ offer: offer2, quantity: item.quantity || 1 });
          basketCost += Number(offer2.price_value) * (item.quantity || 1);
        }
      }
      
      const totalCostWithTravel = basketCost + travelCost;
      
      // Check if this is better than current best
      if (totalCostWithTravel < bestTotalCost) {
        bestTotalCost = totalCostWithTravel;
        bestPlan = {
          total_price: Number(basketCost.toFixed(2)),
          travel_cost: Number(travelCost.toFixed(2)),
          total_with_travel: Number(totalCostWithTravel.toFixed(2)),
          travel_distance: Number(totalTravelDist.toFixed(2)),
          savings_vs_single_store: Number((singleStorePlan.total_price - totalCostWithTravel).toFixed(2)),
          plan: [
            {
              store_id: store1.store_id,
              store_name: store1.store_name,
              items: store1Items.map(({offer, quantity}) => toDealSummary(offer, quantity)),
              distance_km: Number(distToStore1.toFixed(2))
            },
            {
              store_id: store2.store_id,
              store_name: store2.store_name,
              items: store2Items.map(({offer, quantity}) => toDealSummary(offer, quantity)),
              distance_km: Number(distToStore2.toFixed(2))
            }
          ],
          store_count: 2,
          optimization_note: totalCostWithTravel < singleStorePlan.total_price
            ? `2-store plan saves €${(singleStorePlan.total_price - totalCostWithTravel).toFixed(2)} including travel`
            : '1-store plan is more economical'
        };
      }
    }
  }
  
  // Return best plan (2-store if better, otherwise single store)
  if (bestPlan && bestPlan.total_with_travel < singleStorePlan.total_price) {
    return bestPlan;
  }
  
  return {
    ...singleStorePlan,
    store_count: 1,
    optimization_note: 'Single store is more economical when including travel cost'
  };
}

module.exports = {
  optimizeSingleStore,
  optimizeTwoStores,
  calculateDistance,
  getMedianReceiptPrice
};
