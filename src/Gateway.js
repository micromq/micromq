const http = require('http');
const nanoid = require('nanoid');
const qs = require('querystring');
const cookieParser = require('cookie-parser');
const parse = require('co-body');
const prometheus = require('prom-client');
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

      req.path = (req.originalUrl || req.url).split('?')[0];
      req.method = req.method.toLowerCase();
      req.body = body;
      req.query = query;
      req.params = {};
      req.session = {};

      await this.middleware()(req, res, next);
    });
  }

  async _startConsumers() {
    await Promise.all(
      Object.values(this._microservices).map(async (microservice) => {
        const connection = await microservice._createConnection();
        const channel = await connection.createChannel();
        const queueName = `${microservice.responsesQueueName}:${process.pid}`;

        await channel.assertQueue(queueName);

        channel.consume(queueName, async (message) => {
          if (!message || !message.content.toString()) {
            return;
          }

          let json;

          try {
            json = JSON.parse(message.content.toString());
          } catch (err) {
            console.error('Failed to parse response', err);
          }

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

          const { timer, res, resolve } = request;

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

        let resolve;

        const promise = new Promise((res) => {
          resolve = res;
        });

        const message = {
          path: req.path,
          method: req.method,
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
          queue: `${microservice.responsesQueueName}:${process.pid}`,
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

  enablePrometheus(credentials = {}) {
    const histogram = new prometheus.Histogram({
      name: 'http_request_duration_ms',
      help: 'HTTP-requests information',
      labelNames: ['code', 'url'],
      buckets: [0.1, 0.5, 5, 15, 50, 100, 500],
    });
    const basicAuth = `Basic ${Buffer.from(`${credentials.user}:${credentials.password}`).toString('base64')}`;

    this.get(
      '/metrics',
      async (req, res, next) => {
        if (credentials.user && credentials.password && req.headers.authorization !== basicAuth) {
          res.writeHead(403);
          res.end('Access Denied.');

          return;
        }

        await next();
      },
      (req, res) => {
        res.writeHead(200, { 'Content-Type': prometheus.register.contentType });
        res.end(prometheus.register.metrics());
      },
    );

    this.use(async (req, res, next) => {
      const start = Date.now();

      await next();

      if (req.path !== '/metrics') {
        histogram
          .labels(res.statusCode, req.path)
          .observe(Date.now() - start);
      }
    });
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
