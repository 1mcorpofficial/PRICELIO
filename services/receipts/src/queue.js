const amqp = require('amqplib');

const QUEUE_NAME = process.env.RECEIPT_QUEUE || 'receipt_jobs';

async function connectQueue() {
  const url = process.env.RABBITMQ_URL || 'amqp://receiptradar:receiptradar_dev@localhost:5672';
  const connection = await amqp.connect(url);
  const channel = await connection.createChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  return { connection, channel };
}

module.exports = { connectQueue, QUEUE_NAME };
