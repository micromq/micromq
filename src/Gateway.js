const http = require('http');
const nanoid = require('nanoid');
const qs = require('querystring');
const cookieParser = require('cookie-parser');
const parse = require('co-body');
const RabbitApp = require('./RabbitApp');
const BaseApp = require('./BaseApp');
const { isRpcAction, parseRabbitMessage } = require('./utils');

const RESPONSES = {
  TIMED_OUT: JSON.stringify({
    error: 'Timed out',
  }),
};

class Gateway extends BaseApp {
  constructor(options) {
    super({
      requests: {
        timeout: 10000,
      },
      ...options,
    });

    this._consumersReady = false;
    this._requests = new Map();
    this._microservices = options.microservices.reduce((object, name) => ({
      ...object,
      [name]: new RabbitApp({
        rabbit: options.rabbit,
        name,
      }),
    }), {});

    this.use(cookieParser());
    this.use(async (req, res, next) => {
      const [, queryString] = req.url.split('?');
      const query = qs.decode(queryString);
      const body = await parse.json(req);

      req.path = (req.originalUrl || req.url).split('?')[0];
      req.method = req.method.toLowerCase();
      req.body = body;
      req.query = query;
      req.params = {};
      req.session = {};

      await next();
    });
    this.use(this.middleware());
  }

  async _startConsumers() {
    await Promise.all(
      Object.values(this._microservices).map(async (microservice) => {
        const channel = await microservice.createChannelByPid();

        channel.consume(microservice.queuePidName, async (message) => {
          const json = parseRabbitMessage(message);

          if (!json) {
            channel.ack(message);

            return;
          }

          let { statusCode, response } = json;

          const { headers, requestId } = json;
          const request = this._requests.get(requestId);

          if (!request || !response) {
            channel.ack(message);

            return;
          }

          const { timer, res, resolve } = request;

          clearTimeout(timer);

          if (isRpcAction(response)) {
            const result = await this._actions.handle(response);

            statusCode = result.statusCode;
            response = result.response;
          }

          resolve();

          res.writeHead(statusCode, headers);
          res.end(typeof response === 'object' ? JSON.stringify(response) : response);

          channel.ack(message);

          this._requests.delete(requestId);
        });
      }),
    );

    this._consumersReady = true;
  }

  middleware() {
    return async (req, res, next) => {
      if (!this._consumersReady) {
        await this._startConsumers();
      }

      res.delegate = async (name) => {
        const microservice = this._microservices[name];

        if (!microservice) {
          throw new Error(`Microservice ${name} not found`);
        }

        const requestsChannel = await microservice.createRequestsChannel();

        let resolve;

        const promise = new Promise((res) => {
          resolve = res;
        });

        const message = {
          path: (req.originalUrl || req.url).split('?')[0],
          method: req.method.toLowerCase(),
          params: req.params,
          query: req.query,
          body: req.body,
          headers: req.headers,
          cookies: req.cookies,
          session: req.session,
          connection: {
            connecting: req.connection.connecting,
            destroyed: req.connection.destroyed,
            localAddress: req.connection.localAddress,
            localPort: req.connection.localPort,
            pending: req.connection.pending,
            remoteAddress: req.connection.remoteAddress,
            remoteFamily: req.connection.remoteFamily,
            remotePort: req.connection.remotePort,
          },
          requestId: nanoid(),
          queue: microservice.queuePidName,
        };

        this._requests.set(message.requestId, {
          timer: setTimeout(() => {
            res.writeHead(408, { 'Content-Type': 'application/json' });
            res.end(RESPONSES.TIMED_OUT);

            this._requests.delete(message.requestId);
          }, this.options.requests.timeout),
          res,
          resolve,
        });

        requestsChannel.sendToQueue(microservice.requestsQueueName, Buffer.from(JSON.stringify(message)));

        return promise;
      };

      return next();
    };
  }

  async listen(port) {
    if (!this._consumersReady) {
      await this._startConsumers();
    }

    return http
      .createServer((req, res) => this._next(req, res))
      .listen(port);
  }
}

module.exports = Gateway;
