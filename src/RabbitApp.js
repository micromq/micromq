const amqplib = require('amqplib');
const debug = require('./utils/debug')('micromq-rabbit');

class RabbitApp {
  constructor(options) {
    this.options = options;

    this.requestsQueueName = `${this.options.name}:requests`;
    this.responsesQueueName = `${this.options.name}:responses`;
  }

  set connection(connection) {
    this._connection = connection;
  }

  get connection() {
    return this._connection;
  }

  get queuePidName() {
    return `${this.responsesQueueName}-${process.pid}`;
  }

  async createConnection() {
    if (!this.connection) {
      debug(() => 'creating connection');

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

  async createChannel(queueName, options) {
    const connection = await this.createConnection();
    const channel = await connection.createChannel();

    debug(() => `creating channel and asserting to ${queueName} queue`);

    if (queueName) {
      await channel.assertQueue(queueName, options);
    }

    return channel;
  }

  async createResponsesChannel() {
    if (!this.responsesChannel) {
      this.responsesChannel = await this.createChannel(this.responsesQueueName);
    }

    return this.responsesChannel;
  }

  async createRequestsChannel() {
    if (!this.requestsChannel) {
      this.requestsChannel = await this.createChannel(this.requestsQueueName);
    }

    return this.requestsChannel;
  }

  async createChannelByPid(options) {
    if (!this.pidChannel) {
      this.pidChannel = await this.createChannel(this.queuePidName, options);
    }

    return this.pidChannel;
  }
}

module.exports = RabbitApp;
