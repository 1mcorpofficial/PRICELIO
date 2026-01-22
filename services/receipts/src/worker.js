require('dotenv').config();

const pipeline = require('./pipeline');
const { connectQueue, QUEUE_NAME } = require('./queue');
const { updateReceiptStatus, insertReceiptItems } = require('./queries');

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
    const confidence = pipeline.scoreConfidence(matched);
    
    console.log(`Receipt ${payload.receipt_id} confidence: ${confidence.receipt_confidence}`);

    // Insert receipt items
    await insertReceiptItems(payload.receipt_id, matched);
    
    // Determine final status based on confidence
    const finalStatus = confidence.receipt_confidence >= 0.7 
      ? 'processed' 
      : 'needs_confirmation';
    
    await updateReceiptStatus(payload.receipt_id, finalStatus, confidence.receipt_confidence);
    
    console.log(`Receipt ${payload.receipt_id} completed with status: ${finalStatus}`);
  } catch (error) {
    console.error(`Receipt job ${payload.receipt_id} failed:`, error);
    await updateReceiptStatus(payload.receipt_id, 'needs_confirmation');
    throw error;
  }
}

async function startWorker() {
  const { connection, channel } = await connectQueue();
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
    await channel.close();
    await connection.close();
    process.exit(0);
  });
}

startWorker().catch((error) => {
  console.error('Worker failed to start', error);
});
