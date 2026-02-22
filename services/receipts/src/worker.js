require('dotenv').config();

const http = require('http');
const pipeline = require('./pipeline');
const { connectQueue, QUEUE_NAME } = require('./queue');
const { updateReceiptStatus, insertReceiptItems } = require('./queries');

let queueConnected = false;
let lastError = null;
let processedCount = 0;

async function handleReceiptJob(payload) {
  try {
    console.log(`Processing receipt job: ${payload.receipt_id}`);
    
    // Validate upload
    const validation = pipeline.validateUpload({ 
      file_size: payload.file_size || 0, 
      mime_type: payload.mime_type || 'image/jpeg' 
    });
    
    if (!validation.ok) {
      console.warn(`Validation failed for ${payload.receipt_id}:`, validation.reasons);
      await updateReceiptStatus(payload.receipt_id, 'needs_confirmation');
      return;
    }

    // Update status to processing
    await updateReceiptStatus(payload.receipt_id, 'processing');

    // Run AI extraction
    const imagePath = require('path').join(__dirname, '../../api/uploads', payload.object_key);
    const extracted = await pipeline.runExtraction(imagePath);
    
    if (!extracted.line_items || extracted.line_items.length === 0) {
      console.warn(`No line items extracted from ${payload.receipt_id}`);
      await updateReceiptStatus(payload.receipt_id, 'needs_confirmation');
      return;
    }

    console.log(`Extracted ${extracted.line_items.length} items from ${payload.receipt_id}`);

    // Match products
    const matched = await pipeline.matchProducts(extracted.line_items);
    
    // Score confidence
    const confidence = pipeline.scoreConfidence(matched, extracted);
    
    console.log(`Receipt ${payload.receipt_id} confidence: ${confidence.receipt_confidence}`);

    // Insert receipt items
    await insertReceiptItems(payload.receipt_id, matched);
    
    // Determine final status based on confidence
    const extractionQuality = Number(extracted.extraction_quality_score || extracted.extraction_confidence || 0);
    const finalStatus = confidence.receipt_confidence >= 0.7 && extractionQuality >= 0.52
      ? 'processed' 
      : 'needs_confirmation';
    
    await updateReceiptStatus(payload.receipt_id, finalStatus, confidence.receipt_confidence);
    
    console.log(`Receipt ${payload.receipt_id} completed with status: ${finalStatus}`);
    processedCount += 1;
    lastError = null;
  } catch (error) {
    console.error(`Receipt job ${payload.receipt_id} failed:`, error);
    await updateReceiptStatus(payload.receipt_id, 'needs_confirmation');
    lastError = error.message;
    throw error;
  }
}

function startHealthServer() {
  const port = Number(process.env.HEALTH_PORT || process.env.PORT || 4002);
  const server = http.createServer((req, res) => {
    if (req.url !== '/health') {
      res.statusCode = 404;
      res.end('not_found');
      return;
    }

    const body = JSON.stringify({
      status: queueConnected ? 'ok' : 'degraded',
      service: 'receipts-worker',
      queue_connected: queueConnected,
      processed_count: processedCount,
      last_error: lastError,
      timestamp: new Date().toISOString()
    });
    res.setHeader('Content-Type', 'application/json');
    res.end(body);
  });

  server.listen(port, () => {
    console.log(`Receipts worker health endpoint on port ${port}`);
  });
}

async function startWorker() {
  const { connection, channel } = await connectQueue();
  queueConnected = true;
  channel.prefetch(1);
  channel.consume(QUEUE_NAME, async (message) => {
    if (!message) return;
    try {
      const payload = JSON.parse(message.content.toString());
      await handleReceiptJob(payload);
      channel.ack(message);
    } catch (error) {
      console.error('Receipt job failed', error);
      channel.nack(message, false, false);
    }
  });

  process.on('SIGINT', async () => {
    queueConnected = false;
    await channel.close();
    await connection.close();
    process.exit(0);
  });
}

startHealthServer();
startWorker().catch((error) => {
  queueConnected = false;
  lastError = error.message;
  console.error('Worker failed to start', error);
});
