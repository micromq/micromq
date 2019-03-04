const amqplib = require('amqplib');

class RabbitApp {
  constructor(options) {
    this.options = options;

    this.requestsQueueName = `${this.options.name}:requests`;
    this.responsesQueueName = `${this.options.name}:responses`;
  }

  async _createConnection() {
    if (!this._connection) {
      this._connection = await amqplib.connect(this.options.rabbit.url);

      ['error', 'close'].forEach((event) => {
        this._connection.on(event, () => {
          this._connection = null;
          this._createConnection();
        });
      });
    }

    return this._connection;
  }

  async createRequestsChannel() {
    const connection = await this._createConnection();

    if (!this._requestsChannel) {
      this._requestsChannel = await connection.createChannel();

      await this._requestsChannel.assertQueue(this.requestsQueueName);
    }

    return this._requestsChannel;
  }

  async createResponsesChannel() {
    const connection = await this._createConnection();

    if (!this._responsesChannel) {
      this._responsesChannel = await connection.createChannel();

      await this._responsesChannel.assertQueue(this.responsesQueueName);
    }

    return this._responsesChannel;
  }
}

module.exports = RabbitApp;
