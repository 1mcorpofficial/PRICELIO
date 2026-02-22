const amqp = require('amqplib');
const { trackEvent } = require('./tracker');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://127.0.0.1';
const ANALYTICS_QUEUE = 'analytics_events';

let connection = null;
let channel = null;

async function connectQueue() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    
    await channel.assertQueue(ANALYTICS_QUEUE, { durable: true });
    
    console.log('Analytics queue connected');
    return { connection, channel };
  } catch (error) {
    console.error('Queue connection failed:', error);
    throw error;
  }
}

async function publishEvent(event) {
  if (!channel) {
    await connectQueue();
  }
  
  try {
    channel.sendToQueue(
      ANALYTICS_QUEUE,
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );
    return true;
  } catch (error) {
    console.error('Publish event failed:', error);
    return false;
  }
}

async function consumeEvents() {
  if (!channel) {
    await connectQueue();
  }
  
  channel.prefetch(10);
  
  channel.consume(ANALYTICS_QUEUE, async (message) => {
    if (!message) return;
    
    try {
      const event = JSON.parse(message.content.toString());
      await trackEvent(event);
      channel.ack(message);
    } catch (error) {
      console.error('Event processing failed:', error);
      // Reject and don't requeue to prevent infinite loops
      channel.nack(message, false, false);
    }
  });
}

module.exports = {
  connectQueue,
  publishEvent,
  consumeEvents
};
