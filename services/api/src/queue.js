const amqp = require('amqplib');

const QUEUE_NAME = process.env.RECEIPT_QUEUE || 'receipt_jobs';
let connection;
let channel;

async function getChannel() {
  if (channel) return channel;
  const url = process.env.RABBITMQ_URL;
  if (!url && process.env.NODE_ENV === 'production') {
    throw new Error('RABBITMQ_URL is required in production');
  }
  connection = await amqp.connect(url || 'amqp://127.0.0.1:5672');
  channel = await connection.createChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  return channel;
}

async function publishReceiptJob(payload) {
  const activeChannel = await getChannel();
  activeChannel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(payload)), {
    persistent: true
  });
}

module.exports = {
  publishReceiptJob,
  QUEUE_NAME
};
