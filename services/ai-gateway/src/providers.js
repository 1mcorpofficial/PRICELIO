const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { createWorker } = require('tesseract.js');

// Provider initialization
const openaiClient = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Health check for all providers
async function healthCheck() {
  const status = {
    openai: openaiClient ? 'configured' : 'not_configured',
    anthropic: anthropicClient ? 'configured' : 'not_configured',
    tesseract: 'available',
    timestamp: new Date().toISOString()
  };

  return status;
}

// OpenAI Vision extraction
async function extractWithOpenAI(imageBuffer, options = {}) {
  if (!openaiClient) {
    throw new Error('OpenAI not configured');
  }

  const base64Image = imageBuffer.toString('base64');
  const mimeType = 'image/jpeg';

  const prompt = `You are a receipt extraction expert. Analyze this receipt image and extract ALL information in strict JSON format.

Extract:
1. Store name and location (if visible)
2. Receipt date and time
3. ALL line items with: product name, quantity, unit price, total price
4. Subtotal, tax, and total amounts
5. Payment method (if visible)

Return ONLY valid JSON in this exact format:
{
  "store_name": "string or null",
  "store_location": "string or null",
  "receipt_date": "YYYY-MM-DD or null",
  "receipt_time": "HH:MM or null",
  "line_items": [
    {
      "raw_name": "exact product name from receipt",
      "quantity": number,
      "unit_price": number,
      "total_price": number,
      "line_number": number
    }
  ],
  "subtotal": number or null,
  "tax_total": number or null,
  "total": number or null,
  "currency": "EUR",
  "confidence": 0.0 to 1.0
}

Important:
- Extract EVERY product line, even if partially visible
- Use null for missing values
- Preserve exact product names as they appear
- Return confidence score based on image quality
- Use Lithuanian language understanding for product names`;

  const startTime = Date.now();

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });

    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    const data = JSON.parse(jsonMatch[0]);
    
    return {
      provider: 'openai',
      data,
      confidence: data.confidence || 0.85,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    throw new Error(`OpenAI extraction failed: ${error.message}`);
  }
}

// Anthropic Claude extraction
async function extractWithAnthropic(imageBuffer, options = {}) {
  if (!anthropicClient) {
    throw new Error('Anthropic not configured');
  }

  const base64Image = imageBuffer.toString('base64');
  const mimeType = 'image/jpeg';

  const prompt = `Analyze this receipt image and extract all information in strict JSON format.

Return ONLY valid JSON with this structure:
{
  "store_name": "string or null",
  "store_location": "string or null",
  "receipt_date": "YYYY-MM-DD or null",
  "receipt_time": "HH:MM or null",
  "line_items": [
    {
      "raw_name": "exact product name",
      "quantity": number,
      "unit_price": number,
      "total_price": number,
      "line_number": number
    }
  ],
  "subtotal": number or null,
  "tax_total": number or null,
  "total": number or null,
  "currency": "EUR",
  "confidence": 0.0 to 1.0
}

Extract EVERY product line visible. Preserve exact product names.`;

  const startTime = Date.now();

  try {
    const response = await anthropicClient.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64Image
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ]
    });

    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    const data = JSON.parse(jsonMatch[0]);
    
    return {
      provider: 'anthropic',
      data,
      confidence: data.confidence || 0.85,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    throw new Error(`Anthropic extraction failed: ${error.message}`);
  }
}

// Tesseract fallback (basic OCR only)
async function extractWithTesseract(imageBuffer, options = {}) {
  const startTime = Date.now();
  
  try {
    const worker = await createWorker('eng+lit');
    const { data: { text } } = await worker.recognize(imageBuffer);
    await worker.terminate();

    // Basic parsing of OCR text
    const lines = text.split('\n').filter(line => line.trim());
    const lineItems = [];
    
    // Try to extract line items (very basic pattern matching)
    lines.forEach((line, index) => {
      const priceMatch = line.match(/(\d+[.,]\d{2})\s*€?/);
      if (priceMatch) {
        const price = parseFloat(priceMatch[1].replace(',', '.'));
        lineItems.push({
          raw_name: line.replace(/\d+[.,]\d{2}\s*€?/g, '').trim(),
          quantity: 1,
          unit_price: price,
          total_price: price,
          line_number: index + 1
        });
      }
    });

    return {
      provider: 'tesseract',
      data: {
        store_name: null,
        store_location: null,
        receipt_date: null,
        receipt_time: null,
        line_items: lineItems,
        subtotal: null,
        tax_total: null,
        total: null,
        currency: 'EUR',
        confidence: 0.4
      },
      confidence: 0.4,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    throw new Error(`Tesseract extraction failed: ${error.message}`);
  }
}

// OpenAI Vision extraction for store flyers (HTML text or image)
async function extractFlyerWithOpenAI(input, storeName, options = {}) {
  if (!openaiClient) {
    throw new Error('OpenAI not configured');
  }

  const startTime = Date.now();
  const isImage = Buffer.isBuffer(input);

  const systemPrompt = `You are a Lithuanian grocery store flyer extraction expert.
Extract ALL product offers from store promotional materials.
Return ONLY valid JSON — no markdown, no explanation.`;

  const userPrompt = `Extract all product offers from this ${storeName} store flyer/promotion page.

Return JSON array with this exact structure:
{
  "offers": [
    {
      "product_name": "exact product name in Lithuanian",
      "brand": "brand name or null",
      "quantity": "package size e.g. 1L, 500g, 10vnt or null",
      "price": number (EUR, e.g. 1.99),
      "old_price": number or null,
      "discount_percent": number or null,
      "valid_from": "YYYY-MM-DD or null",
      "valid_to": "YYYY-MM-DD or null",
      "category": "Dairy|Bakery|Meat|Fish|Produce|Frozen|Beverage|Household|Personal care|Other"
    }
  ],
  "store": "${storeName}",
  "confidence": 0.0 to 1.0
}

Rules:
- Extract EVERY product with a price
- Keep Lithuanian product names as-is
- Parse dates from Lithuanian (pvz. "sausio 20 d." = January 20, "vasario" = February, "kovo" = March)
- Combine product name + quantity into product_name if they appear together
- Calculate discount_percent if old_price is available
- Return empty offers array if no products found`;

  try {
    const messages = isImage
      ? [
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${input.toString('base64')}` }
              }
            ]
          }
        ]
      : [
          {
            role: 'user',
            content: `${userPrompt}\n\n--- FLYER TEXT ---\n${input}`
          }
        ];

    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 4000,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    const data = JSON.parse(content);

    return {
      provider: 'openai',
      data,
      confidence: data.confidence || 0.8,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    throw new Error(`OpenAI flyer extraction failed: ${error.message}`);
  }
}

// Anthropic Claude flyer extraction
async function extractFlyerWithAnthropic(input, storeName, options = {}) {
  if (!anthropicClient) {
    throw new Error('Anthropic not configured');
  }

  const startTime = Date.now();
  const isImage = Buffer.isBuffer(input);

  const prompt = `Extract all product offers from this ${storeName} store flyer.
Return ONLY valid JSON with this structure:
{"offers":[{"product_name":"string","brand":"string or null","quantity":"string or null","price":number,"old_price":number or null,"discount_percent":number or null,"valid_from":"YYYY-MM-DD or null","valid_to":"YYYY-MM-DD or null","category":"string"}],"store":"${storeName}","confidence":number}
Keep Lithuanian names as-is. Parse Lithuanian month names (sausio=Jan, vasario=Feb, kovo=Mar, balandžio=Apr, gegužės=May, birželio=Jun, liepos=Jul, rugpjūčio=Aug, rugsėjo=Sep, spalio=Oct, lapkričio=Nov, gruodžio=Dec).`;

  try {
    const content = isImage
      ? [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: input.toString('base64') } },
          { type: 'text', text: prompt }
        ]
      : [{ type: 'text', text: `${prompt}\n\n--- FLYER TEXT ---\n${input}` }];

    const response = await anthropicClient.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{ role: 'user', content }]
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No valid JSON in response');

    const data = JSON.parse(jsonMatch[0]);

    return {
      provider: 'anthropic',
      data,
      confidence: data.confidence || 0.75,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    throw new Error(`Anthropic flyer extraction failed: ${error.message}`);
  }
}

module.exports = {
  healthCheck,
  extractWithOpenAI,
  extractWithAnthropic,
  extractWithTesseract,
  extractFlyerWithOpenAI,
  extractFlyerWithAnthropic
};
