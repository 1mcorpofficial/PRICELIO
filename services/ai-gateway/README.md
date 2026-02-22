# AI Gateway

AI provider abstraction layer for receipt OCR and extraction.

## Features

- **Provider cascade**: Tries OpenAI GPT-4 Vision → Anthropic Claude → Tesseract OCR
- **Image preprocessing**: Auto-resize, normalize, sharpen for better OCR
- **Validation**: Strict mode ensures quality extraction with retry logic
- **Rate limiting**: Configurable limits per provider
- **Health monitoring**: Check provider status and availability

## API Endpoints

### `POST /extract/receipt`

Extract structured data from receipt image.

**Request:**
```
Content-Type: multipart/form-data

image: file (JPEG/PNG, max 10MB)
provider: string (optional) - "openai" | "anthropic" | "tesseract"
language: string (optional) - default "lt"
strict_mode: boolean (optional) - default true
scan_mode: string (optional) - default "full_receipt"
min_quality_score: number (optional) - default 0.67
```

**Response:**
```json
{
  "success": true,
  "provider": "openai",
  "extraction": {
    "scan_mode": "full_receipt",
    "store_name": "Maxima X",
    "receipt_date": "2026-01-15",
    "line_items": [
      {
        "raw_name": "Greek yogurt 400g",
        "quantity": 1,
        "unit_price": 1.19,
        "total_price": 1.19,
        "line_number": 1
      }
    ],
    "total": 15.43,
    "currency": "EUR",
    "confidence": 0.92,
    "quality_score": 0.86,
    "quality_flags": []
  },
  "confidence": 0.92,
  "processing_time_ms": 2341
}
```

### `GET /health`

Check provider availability.

**Response:**
```json
{
  "openai": "configured",
  "anthropic": "not_configured",
  "tesseract": "available",
  "timestamp": "2026-01-21T..."
}
```

## Setup

```bash
cd services/ai-gateway
npm install
cp .env.example .env
# Add your API keys to .env
npm run dev
```

## Environment Variables

```env
PORT=3001
OPENAI_API_KEY=CHANGE_ME
ANTHROPIC_API_KEY=sk-ant-...
DEFAULT_PROVIDER=openai
MAX_RETRIES=2
TIMEOUT_MS=30000
RECEIPT_QUALITY_ACCEPTANCE_SCORE=0.67
RECEIPT_QUALITY_MIN_VALID_SCORE=0.42
```

## Provider Details

### OpenAI GPT-4 Vision
- Model: `gpt-4o`
- Best for: High-quality extraction with Lithuanian language support
- Cost: ~$0.002/image

### Anthropic Claude
- Model: `claude-3-haiku-20240307`
- Best for: Alternative when OpenAI is unavailable
- Cost: ~$0.0025/image

### Tesseract OCR
- Fallback when APIs unavailable
- Free but lower accuracy
- No structured extraction (basic pattern matching only)
