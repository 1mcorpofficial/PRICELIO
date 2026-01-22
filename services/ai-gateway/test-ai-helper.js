/**
 * AI Helper Test Suite
 * Tests all AI functions to ensure they work correctly
 */

require('dotenv').config();
const aiHelper = require('./src/ai-helper');

console.log('🧪 TESTING AI HELPER FUNCTIONS');
console.log('==========================================\n');

async function runTests() {
  let passedTests = 0;
  let failedTests = 0;

  // ===================================================
  // TEST 1: Nutritional Analysis
  // ===================================================
  console.log('📊 TEST 1: Nutritional Analysis');
  try {
    const result = await aiHelper.analyzeNutritionalValue(
      'Coca-Cola 1.5L',
      'Vanduo, cukrus, CO2, karamelės spalva (E150d), rūgštis (E338), natūralūs aromatai, kofeinas',
      {
        calories: 42,
        sugar: 10.6,
        fat: 0,
        protein: 0
      }
    );

    if (result && result.health_score && result.harmful_substances) {
      console.log('✅ PASSED - Nutritional analysis works!');
      console.log(`   Health Score: ${result.health_score}/100`);
      console.log(`   Harmful substances: ${result.harmful_substances.length}`);
      console.log(`   Is healthy: ${result.is_healthy ? 'Yes' : 'No'}`);
      passedTests++;
    } else {
      console.log('❌ FAILED - Invalid response structure');
      failedTests++;
    }
  } catch (error) {
    console.log(`❌ FAILED - Error: ${error.message}`);
    failedTests++;
  }
  console.log('');

  // ===================================================
  // TEST 2: Price Analysis
  // ===================================================
  console.log('💰 TEST 2: Price Analysis');
  try {
    const product = {
      name: 'Pienas 2.5% 1L',
      current_price: 1.29
    };

    const historicalPrices = [
      { date: '2026-01-01', price: 1.39 },
      { date: '2026-01-08', price: 1.35 },
      { date: '2026-01-15', price: 1.29 },
      { date: '2026-01-22', price: 1.29 }
    ];

    const result = await aiHelper.analyzePriceChanges(product, historicalPrices);

    if (result && result.trend && result.is_good_deal !== undefined) {
      console.log('✅ PASSED - Price analysis works!');
      console.log(`   Trend: ${result.trend}`);
      console.log(`   Average: €${result.average_price}`);
      console.log(`   Good deal: ${result.is_good_deal ? 'Yes' : 'No'}`);
      console.log(`   Recommendation: ${result.recommendation}`);
      passedTests++;
    } else {
      console.log('❌ FAILED - Invalid response structure');
      failedTests++;
    }
  } catch (error) {
    console.log(`❌ FAILED - Error: ${error.message}`);
    failedTests++;
  }
  console.log('');

  // ===================================================
  // TEST 3: Basket Optimization
  // ===================================================
  console.log('🛒 TEST 3: Basket Optimization');
  try {
    const basketItems = [
      { name: 'Duona', quantity: 2, price: 1.20 },
      { name: 'Pienas 1L', quantity: 2, price: 1.30 },
      { name: 'Kiaušiniai 10vnt', quantity: 1, price: 2.50 }
    ];

    const userPreferences = {
      budget: 10.00,
      prefer_organic: false,
      health_conscious: true
    };

    const result = await aiHelper.optimizeBasketWithAI(basketItems, userPreferences);

    if (result && result.optimized_total !== undefined) {
      console.log('✅ PASSED - Basket optimization works!');
      console.log(`   Original total: €${result.original_total}`);
      console.log(`   Optimized total: €${result.optimized_total}`);
      console.log(`   Savings: €${result.savings}`);
      console.log(`   Recommendations: ${result.recommendations?.length || 0}`);
      passedTests++;
    } else {
      console.log('❌ FAILED - Invalid response structure');
      failedTests++;
    }
  } catch (error) {
    console.log(`❌ FAILED - Error: ${error.message}`);
    failedTests++;
  }
  console.log('');

  // ===================================================
  // TEST 4: Product Comparison
  // ===================================================
  console.log('🔍 TEST 4: Product Comparison');
  try {
    const products = [
      {
        name: 'Rimi Pienas 2.5% 1L',
        price: 1.29,
        brand: 'Rimi',
        unit_price: 1.29
      },
      {
        name: 'Žemaitijos Pienas 2.5% 1L',
        price: 1.49,
        brand: 'Žemaitijos',
        unit_price: 1.49
      },
      {
        name: 'Ekologiškas Pienas 2.5% 1L',
        price: 1.99,
        brand: 'Organic',
        unit_price: 1.99
      }
    ];

    const result = await aiHelper.compareProducts(products);

    if (result && result.best_overall) {
      console.log('✅ PASSED - Product comparison works!');
      console.log(`   Best overall: ${result.best_overall}`);
      console.log(`   Best price: ${result.best_price}`);
      console.log(`   Best quality: ${result.best_quality}`);
      console.log(`   Best value: ${result.best_value}`);
      passedTests++;
    } else {
      console.log('❌ FAILED - Invalid response structure');
      failedTests++;
    }
  } catch (error) {
    console.log(`❌ FAILED - Error: ${error.message}`);
    failedTests++;
  }
  console.log('');

  // ===================================================
  // TEST 5: Smart Search
  // ===================================================
  console.log('🔎 TEST 5: Smart Search');
  try {
    const availableProducts = [
      { id: '1', name: 'Juoda duona 500g', category: 'Duona' },
      { id: '2', name: 'Balta duona 400g', category: 'Duona' },
      { id: '3', name: 'Pilno grūdo duona 600g', category: 'Duona' },
      { id: '4', name: 'Batonas 200g', category: 'Duona' }
    ];

    const result = await aiHelper.smartSearch('sveika duona pusryčiams', availableProducts);

    if (result && result.results) {
      console.log('✅ PASSED - Smart search works!');
      console.log(`   Understood query: ${result.understood_query}`);
      console.log(`   Results found: ${result.results.length}`);
      if (result.results.length > 0) {
        console.log(`   Top result: ${result.results[0].name} (${result.results[0].relevance_score})`);
      }
      passedTests++;
    } else {
      console.log('❌ FAILED - Invalid response structure');
      failedTests++;
    }
  } catch (error) {
    console.log(`❌ FAILED - Error: ${error.message}`);
    failedTests++;
  }
  console.log('');

  // ===================================================
  // TEST 6: AI Assistant
  // ===================================================
  console.log('🤖 TEST 6: AI Assistant');
  try {
    const result = await aiHelper.aiAssistant(
      'Kaip sutaupyti pinigų perkant maistą?',
      { user_budget: 50, family_size: 2 }
    );

    if (result && result.answer) {
      console.log('✅ PASSED - AI assistant works!');
      console.log(`   Answer length: ${result.answer.length} chars`);
      console.log(`   Tokens used: ${result.tokens_used}`);
      console.log(`   Answer preview: ${result.answer.substring(0, 100)}...`);
      passedTests++;
    } else {
      console.log('❌ FAILED - Invalid response structure');
      failedTests++;
    }
  } catch (error) {
    console.log(`❌ FAILED - Error: ${error.message}`);
    failedTests++;
  }
  console.log('');

  // ===================================================
  // SUMMARY
  // ===================================================
  console.log('==========================================');
  console.log('📊 TEST SUMMARY');
  console.log('==========================================');
  console.log(`✅ Passed: ${passedTests}/6`);
  console.log(`❌ Failed: ${failedTests}/6`);
  console.log(`📈 Success Rate: ${((passedTests / 6) * 100).toFixed(0)}%`);
  console.log('==========================================\n');

  if (passedTests === 6) {
    console.log('🎉 ALL TESTS PASSED! AI Helper is ready to use!');
    return true;
  } else {
    console.log('⚠️  Some tests failed. Check OpenAI API key and error messages.');
    return false;
  }
}

// Run tests
runTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
