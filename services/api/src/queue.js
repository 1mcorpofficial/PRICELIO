const amqp = require('amqplib');

const QUEUE_NAME = process.env.RECEIPT_QUEUE || 'receipt_jobs';
let connection;
let channel;

async function getChannel() {
  if (channel) return channel;
  const url = process.env.RABBITMQ_URL || 'amqp://receiptradar:receiptradar_dev@localhost:5672';
  connection = await amqp.connect(url);
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
