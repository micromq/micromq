const nanoid = require('nanoid');
const BaseApp = require('./BaseApp');
const RabbitApp = require('./RabbitApp');
const Response = require('./Response');
const Server = require('./Server');
const { isRpcAction, parseRabbitMessage, improveHttpResponse } = require('./utils');
const debug = require('./utils/debug')('micromq-microservice');

class MicroService extends BaseApp {
  constructor(options) {
    super(options);

    this._requests = new Map();
    this._microservices = new Map();
  }

  async ask(name, query) {
    let _resolve;

    let app = this._microservices.get(name);

    if (!app) {
      const microservice = new RabbitApp({
        rabbit: this.options.rabbit,
        name,
      });

      // reuse current microservice connection
      microservice.connection = this.connection;

      const [requestsChannel, responsesChannel] = await Promise.all([
        microservice.createRequestsChannel(),
        microservice.createChannelByPid(),
      ]);

      responsesChannel.consume(microservice.queuePidName, (message) => {
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

      this._microservices.set(name, {
        channel: requestsChannel,
        requestsQueueName: microservice.requestsQueueName,
        responsesQueueName: microservice.queuePidName,
      });

      app = this._microservices.get(name);
    }

    const promise = new Promise((resolve) => {
      _resolve = resolve;
    });

    const requestId = nanoid();

    this._requests.set(requestId, {
      resolve: _resolve,
    });

    await app.channel.sendToQueue(app.requestsQueueName, Buffer.from(JSON.stringify({
      ...query,
      requestId,
      queue: app.responsesQueueName,
    })));

    return promise;
  }

  listen(port) {
    const server = new Server();

    server.all('(.*)', async (req, res) => {
      req.app = this;
      res.app = this;

      improveHttpResponse(res);

      await this._next(req, res);
    });

    return server.createServer(port);
  }

  async start() {
    const requestsChannel = await this.createRequestsChannel();

    debug(() => `starting to consume ${this.requestsQueueName}`);

    // prepare responses channel before consume
    await this.createResponsesChannel();

    requestsChannel.consume(this.requestsQueueName, async (message) => {
      const json = parseRabbitMessage(message);

      if (!json) {
        requestsChannel.ack(message);

        return;
      }

      const { requestId, queue, ...request } = json;

      const responsesChannel = await this.createResponsesChannel();
      const response = new Response(responsesChannel, queue, requestId);

      request.app = this;
      response.app = this;

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
