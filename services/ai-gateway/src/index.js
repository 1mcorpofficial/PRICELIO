require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { extractReceipt } = require('./extractor');
const { healthCheck, extractFlyerWithOpenAI, extractFlyerWithAnthropic } = require('./providers');
const aiHelper = require('./ai-helper');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 10 * 1024 * 1024 } 
});

app.get('/health', async (req, res) => {
  const health = await healthCheck();
  res.json(health);
});

// Main extraction endpoint
app.post('/extract/receipt', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'image_required' });
    }

    const options = {
      provider: req.body.provider || process.env.DEFAULT_PROVIDER || 'openai',
      language: req.body.language || 'lt',
      strictMode: req.body.strict_mode !== 'false'
    };

    const result = await extractReceipt(req.file.buffer, options);
    
    res.json({
      success: true,
      provider: result.provider,
      extraction: result.data,
      confidence: result.confidence,
      processing_time_ms: result.processingTime
    });
  } catch (error) {
    console.error('Extraction failed:', error);
    res.status(500).json({ 
      success: false,
      error: 'extraction_failed', 
      message: error.message 
    });
  }
});

// Batch extraction endpoint
app.post('/extract/batch', async (req, res) => {
  try {
    const { image_urls } = req.body;
    if (!Array.isArray(image_urls) || image_urls.length === 0) {
      return res.status(400).json({ error: 'image_urls_required' });
    }

    res.json({
      success: true,
      batch_id: `batch_${Date.now()}`,
      message: 'Batch processing started',
      count: image_urls.length
    });
  } catch (error) {
    res.status(500).json({ error: 'batch_failed', message: error.message });
  }
});

// Flyer extraction endpoint (image or text body)
// POST /extract/flyer  — multipart image OR JSON { text, store_name }
app.post('/extract/flyer', upload.single('image'), async (req, res) => {
  try {
    const storeName = req.body.store_name || 'Unknown';
    const provider = req.body.provider || process.env.DEFAULT_PROVIDER || 'openai';

    let input;
    if (req.file) {
      // Image-based (PDF page converted to image, or flyer photo)
      input = req.file.buffer;
    } else if (req.body.text) {
      // Text extracted from PDF (pdf-parse output)
      input = req.body.text;
    } else {
      return res.status(400).json({ error: 'image_or_text_required' });
    }

    let result;
    try {
      if (provider === 'anthropic') {
        result = await extractFlyerWithAnthropic(input, storeName);
      } else {
        result = await extractFlyerWithOpenAI(input, storeName);
      }
    } catch (primaryError) {
      console.warn(`Primary provider (${provider}) failed, trying fallback:`, primaryError.message);
      // Try opposite provider as fallback
      result = provider === 'anthropic'
        ? await extractFlyerWithOpenAI(input, storeName)
        : await extractFlyerWithAnthropic(input, storeName);
    }

    res.json({
      success: true,
      provider: result.provider,
      store: storeName,
      offers: result.data.offers || [],
      confidence: result.confidence,
      processing_time_ms: result.processingTime
    });
  } catch (error) {
    console.error('Flyer extraction failed:', error);
    res.status(500).json({
      success: false,
      error: 'extraction_failed',
      message: error.message
    });
  }
});

// ===================================================
// AI HELPER ENDPOINTS
// ===================================================

// 1. Extract store data from HTML
app.post('/ai/extract-store-data', async (req, res) => {
  try {
    const { html, store_name } = req.body;
    
    if (!html || !store_name) {
      return res.status(400).json({ error: 'html_and_store_name_required' });
    }
    
    const result = await aiHelper.extractStoreData(html, store_name);
    res.json(result);
  } catch (error) {
    console.error('Store data extraction error:', error);
    res.status(500).json({ error: 'extraction_failed', message: error.message });
  }
});

// 2. Analyze price changes
app.post('/ai/analyze-prices', async (req, res) => {
  try {
    const { product, historical_prices } = req.body;
    
    if (!product || !historical_prices) {
      return res.status(400).json({ error: 'product_and_history_required' });
    }
    
    const analysis = await aiHelper.analyzePriceChanges(product, historical_prices);
    res.json(analysis);
  } catch (error) {
    console.error('Price analysis error:', error);
    res.status(500).json({ error: 'analysis_failed', message: error.message });
  }
});

// 3. Optimize basket with AI
app.post('/ai/optimize-basket', async (req, res) => {
  try {
    const { basket_items, user_preferences } = req.body;
    
    if (!basket_items || !Array.isArray(basket_items)) {
      return res.status(400).json({ error: 'basket_items_required' });
    }
    
    const optimization = await aiHelper.optimizeBasketWithAI(basket_items, user_preferences || {});
    res.json(optimization);
  } catch (error) {
    console.error('Basket optimization error:', error);
    res.status(500).json({ error: 'optimization_failed', message: error.message });
  }
});

// 4. Analyze nutritional value
app.post('/ai/analyze-nutrition', async (req, res) => {
  try {
    const { product_name, ingredients, nutritional_info } = req.body;
    
    if (!product_name) {
      return res.status(400).json({ error: 'product_name_required' });
    }
    
    const analysis = await aiHelper.analyzeNutritionalValue(
      product_name, 
      ingredients, 
      nutritional_info
    );
    res.json(analysis);
  } catch (error) {
    console.error('Nutritional analysis error:', error);
    res.status(500).json({ error: 'analysis_failed', message: error.message });
  }
});

// 5. Compare products
app.post('/ai/compare-products', async (req, res) => {
  try {
    const { products } = req.body;
    
    if (!products || !Array.isArray(products) || products.length < 2) {
      return res.status(400).json({ error: 'at_least_2_products_required' });
    }
    
    const comparison = await aiHelper.compareProducts(products);
    res.json(comparison);
  } catch (error) {
    console.error('Product comparison error:', error);
    res.status(500).json({ error: 'comparison_failed', message: error.message });
  }
});

// 6. Smart search
app.post('/ai/smart-search', async (req, res) => {
  try {
    const { query, available_products } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'query_required' });
    }
    
    const results = await aiHelper.smartSearch(query, available_products || []);
    res.json(results);
  } catch (error) {
    console.error('Smart search error:', error);
    res.status(500).json({ error: 'search_failed', message: error.message });
  }
});

// 7. AI Assistant - general questions
app.post('/ai/assistant', async (req, res) => {
  try {
    const { question, context } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'question_required' });
    }
    
    const response = await aiHelper.aiAssistant(question, context || {});
    res.json(response);
  } catch (error) {
    console.error('AI assistant error:', error);
    res.status(500).json({ error: 'assistant_failed', message: error.message });
  }
});

app.listen(port, () => {
  console.log(`AI Gateway running on port ${port}`);
  console.log('✅ AI Helper Functions Available:');
  console.log('  - POST /ai/extract-store-data');
  console.log('  - POST /ai/analyze-prices');
  console.log('  - POST /ai/optimize-basket');
  console.log('  - POST /ai/analyze-nutrition');
  console.log('  - POST /ai/compare-products');
  console.log('  - POST /ai/smart-search');
  console.log('  - POST /ai/assistant');
});
