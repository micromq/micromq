const nanoid = require('nanoid');
const BaseApp = require('./BaseApp');
const RabbitApp = require('./RabbitApp');
const Response = require('./Response');
const rpcActions = require('./managers/RpcActions');
const { isRpcAction, parseRabbitMessage } = require('./utils');

class MicroService extends BaseApp {
  constructor(options) {
    super(options);

    this._requests = new Map();
    this._microservices = new Map();
  }

  async ask(name, query) {
    let _resolve;

    let { microservice, channel, queueName } = this._microservices.get(name) || {};

    if (!microservice) {
      microservice = new RabbitApp({
        rabbit: this.options.rabbit,
        name,
      });

      const connection = await microservice._createConnection();
      const responsesChannel = await connection.createChannel();

      channel = await connection.createChannel();
      queueName = `${microservice.responsesQueueName}-${process.pid}`;

      await responsesChannel.assertQueue(queueName);

      responsesChannel.consume(queueName, (message) => {
        const json = parseRabbitMessage(message);

        if (!json) {
          responsesChannel.ack(message);

          return;
        }

        const { response, statusCode, requestId } = json;
        const { resolve } = this._requests.get(requestId);

        resolve({ status: statusCode, response });

        this._requests.delete(requestId);
        responsesChannel.ack(message);
      });

      this._microservices.set(name, { microservice, channel, queueName });
    }

    const promise = new Promise((resolve) => {
      _resolve = resolve;
    });

    const requestId = nanoid();

    this._requests.set(requestId, {
      resolve: _resolve,
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
      const json = parseRabbitMessage(message);

      if (!json) {
        requestsChannel.ack(message);

        return;
      }

      const { requestId, queue, ...request } = json;

      const responsesChannel = await this.createResponsesChannel();
      const response = new Response(responsesChannel, queue, requestId);

      if (isRpcAction(request)) {
        const { statusCode, response: rpcResponse } = await this._actions.handle(request);

        response.status(statusCode);
        response.json(rpcResponse);
      } else {
        await this._next(request, response);
      }

      requestsChannel.ack(message);
    });
  }
}

module.exports = MicroService;
