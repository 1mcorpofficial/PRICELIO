const amqp = require('amqplib');

const QUEUE_NAME = process.env.RECEIPT_QUEUE || 'receipt_jobs';

async function connectQueue() {
  const url = process.env.RABBITMQ_URL;
  if (!url && process.env.NODE_ENV === 'production') {
    throw new Error('RABBITMQ_URL is required in production');
  }
  const connection = await amqp.connect(url || 'amqp://127.0.0.1:5672');
  const channel = await connection.createChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  return { connection, channel };
}

module.exports = { connectQueue, QUEUE_NAME };
