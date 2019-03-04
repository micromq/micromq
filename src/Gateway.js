const http = require('http');
const nanoid = require('nanoid');
const qs = require('querystring');
const cookieParser = require('cookie-parser');
const parse = require('co-body');
const RabbitApp = require('./RabbitApp');
const BaseApp = require('./BaseApp');

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
    this._actions = new Map();
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

      req.body = body;
      req.query = query;
      req.session = {};

      await this.middleware()(req, res, next);
    });
  }

  async _startConsumers() {
    await Promise.all(
      Object.values(this._microservices).map(async (microservice) => {
        const connection = await microservice._createConnection();
        const channel = await connection.createChannel();
        const queueName = `${microservice.responsesQueueName}:${process.env.PORT}`;

        await channel.assertQueue(queueName);

        channel.consume(queueName, async (message) => {
          // empty message
          if (!message || !message.content.toString()) {
            return;
          }

          let json;

          try {
            json = JSON.parse(message.content.toString());
          } catch (err) {
            console.error('Failed to parse response', err);
          }

          // empty or invalid response
          if (!json) {
            channel.ack(message);

            return;
          }

          let { statusCode, response } = json;

          const { headers, requestId } = json;
          const request = this._requests.get(requestId);

          // response or client not found
          if (!request || !response) {
            channel.ack(message);

            return;
          }

          const { timer, res } = request;

          clearTimeout(timer);

          if (typeof response === 'object' && typeof response.server === 'object' && response.server.action) {
            const { action, meta } = response.server;
            const handler = this._actions.get(action);

            if (!handler) {
              console.warn(`Action "${action}" not found`, response);

              return;
            }

            const result = await handler(meta);

            if (Array.isArray(result) && result.length === 2) {
              statusCode = result[0];
              response = result[1];
            } else {
              statusCode = 200;
              response = result;
            }
          }

          res.writeHead(statusCode, headers);
          res.end(typeof response === 'object' ? JSON.stringify(response) : response);

          channel.ack(message);

          this._requests.delete(requestId);
        });
      }),
    );

    this._consumersReady = true;
  }

  action(name, handler) {
    this._actions.set(name, handler);

    return this;
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

        const message = {
          path: (req.originalUrl || req.url).split('?')[0],
          method: req.method.toLowerCase(),
          query: req.query,
          body: req.body,
          headers: req.headers,
          cookies: req.cookies,
          session: req.session,
          requestId: nanoid(),
          queue: `${microservice.responsesQueueName}:${process.env.PORT}`,
        };

        this._requests.set(message.requestId, {
          timer: setTimeout(() => {
            res.writeHead(408, { 'Content-Type': 'application/json' });
            res.end(RESPONSES.TIMED_OUT);

            this._requests.delete(message.requestId);
          }, this.options.requests.timeout),
          res,
        });

        requestsChannel.sendToQueue(microservice.requestsQueueName, Buffer.from(JSON.stringify(message)));
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
