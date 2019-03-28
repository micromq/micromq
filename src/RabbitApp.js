const amqplib = require('amqplib');

class RabbitApp {
  constructor(options) {
    this.options = options;

    this.requestsQueueName = `${this.options.name}:requests`;
    this.responsesQueueName = `${this.options.name}:responses`;
  }

  get queuePidName() {
    return `${this.responsesQueueName}-${process.pid}`;
  }

  async createConnection() {
    if (!this.connection) {
      this.connection = await amqplib.connect(this.options.rabbit.url);

      ['error', 'close'].forEach((event) => {
        this.connection.on(event, () => {
          this.connection = null;
          this.createConnection();
        });
      });
    }

    return this.connection;
  }

  async createChannel(queueName) {
    const connection = await this.createConnection();
    const channel = await connection.createChannel();

    if (queueName) {
      await channel.assertQueue(queueName);
    }

    return channel;
  }

  async createRequestsChannel() {
    if (!this.requestsChannel) {
      this.requestsChannel = await this.createChannel(this.requestsQueueName);
    }

    return this.requestsChannel;
  }

  async createChannelByPid() {
    if (!this.pidChannel) {
      this.pidChannel = await this.createChannel(this.queuePidName);
    }

    return this.pidChannel;
  }
}

module.exports = RabbitApp;
