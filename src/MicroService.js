const nanoid = require('nanoid');
const BaseApp = require('./BaseApp');
const RabbitApp = require('./RabbitApp');
const Response = require('./Response');

class MicroService extends BaseApp {
  constructor(options) {
    super(options);

    this._requests = new Map();
    this._microservices = new Map();
  }

  async _handler({ requestId, queue, ...request }) {
    const responsesChannel = await this.createResponsesChannel();
    const response = new Response(responsesChannel, queue, requestId);

    return this._next(request, response);
  }

  async ask(query) {
    let _resolve;
    let _reject;

    let { microservice, channel, queueName } = this._microservices.get(query.microservice) || {};

    if (!microservice) {
      microservice = new RabbitApp({
        rabbit: this.options.rabbit,
        name: query.microservice,
      });

      const connection = await microservice._createConnection();
      const responsesChannel = await connection.createChannel();

      channel = await connection.createChannel();
      queueName = `${microservice.responsesQueueName}-${process.pid}`;

      await responsesChannel.assertQueue(queueName);

      responsesChannel.consume(queueName, (message) => {
        if (!message || !message.content.toString()) {
          return;
        }

        const { response, statusCode, requestId } = JSON.parse(message.content.toString());
        const { resolve, reject } = this._requests.get(requestId);

        if (statusCode >= 400) {
          reject(response);
        } else {
          resolve(response);
        }

        this._requests.delete(requestId);
        responsesChannel.ack(message);
      });

      this._microservices.set(query.microservice, { microservice, channel, queueName });
    }

    const promise = new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    });

    const requestId = nanoid();

    this._requests.set(requestId, {
      resolve: _resolve,
      reject: _reject,
    });

    await channel.sendToQueue(microservice.requestsQueueName, Buffer.from(JSON.stringify({
      ...query,
      requestId,
      queue: queueName,
    })));

    return promise;
  }

  async start() {
    const requestsChannel = await this.createRequestsChannel();

    requestsChannel.consume(this.requestsQueueName, async (message) => {
      if (!message || !message.content.toString()) {
        return;
      }

      await this._handler(JSON.parse(message.content.toString()));

      requestsChannel.ack(message);
    });
  }
}

module.exports = MicroService;
