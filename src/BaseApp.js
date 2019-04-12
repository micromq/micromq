const methods = require('methods');
const pathToRegex = require('path-to-regexp');
const prometheus = require('prom-client');
const RabbitApp = require('./RabbitApp');
const RpcActions = require('./managers/RpcActions');
const { toArray } = require('./utils');

class BaseApp extends RabbitApp {
  constructor(options) {
    super(options);

    this._handlers = new Map();
    this._actions = new RpcActions();
    this._middlewares = [];
  }

  _next(req, res, idx = -1) {
    if (this._middlewares.length > idx + 1) {
      const { match, fn } = this._middlewares[idx + 1];

      return match(req)
        ? fn(req, res)
        : this._next(req, res, idx + 1);
    }
  }

  _createEndpoint(path, method, ...middlewares) {
    const paths = path && toArray(path).map((path) => {
      const keys = [];

      return {
        regex: pathToRegex(path, keys),
        keys,
      };
    });

    middlewares.forEach((middleware) => {
      const idx = this._middlewares.length;

      this._middlewares.push({
        match: (req) => {
          const pathMatch = !paths || paths.find(path => path.regex.test(req.path));
          const methodMatch = !method || req.method === method;

          if (typeof pathMatch === 'object') {
            req.params = {
              ...req.params,
              ...req.path.match(pathMatch.regex).slice(1).reduce((object, value, index) => {
                const { name } = pathMatch.keys[index];

                return name ? { ...object, [name]: value } : object;
              }, {}),
            };
          }

          return pathMatch && methodMatch;
        },
        fn: (req, res) => middleware(req, res, () => this._next(req, res, idx)),
      });
    });
  }

  on(event, handler) {
    this._handlers.set(event, handler);

    return this;
  }

  action(name, handler) {
    toArray(name).forEach((action) => {
      this._actions.add(action, handler);
    });

    return this;
  }

  emit(event, ...args) {
    const handler = this._handlers.get(event);

    if (!handler) {
      console.error(`Emitting on not found handler was ignored (${event})`);

      return;
    }

    handler(...args);

    return this;
  }

  enablePrometheus(...args) {
    let endpoint = '/metrics';
    let credentials = {};

    if (args[0] && typeof args[0] === 'string') {
      endpoint = args[0];
    }

    if (args[0] && typeof args[0] === 'object') {
      credentials = args[0];
    }

    if (args[1] && typeof args[1] === 'object') {
      credentials = args[1];
    }

    const histogram = new prometheus.Histogram({
      name: 'http_request_duration_ms',
      help: 'HTTP-requests information',
      labelNames: ['code', 'url'],
      buckets: [0.1, 0.5, 5, 15, 50, 100, 500],
    });
    const basicAuth = `Basic ${Buffer.from(`${credentials.user}:${credentials.password}`).toString('base64')}`;

    this.get(
      endpoint,
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

      if (req.path !== endpoint) {
        histogram
          .labels(res.statusCode, req.path)
          .observe(Date.now() - start);
      }
    });
  }

  use(...middlewares) {
    this._createEndpoint(undefined, undefined, ...middlewares);

    return this;
  }

  all(path, ...middlewares) {
    this._createEndpoint(path, undefined, ...middlewares);

    return this;
  }
}

methods.forEach((method) => {
  BaseApp.prototype[method] = function(path, ...middlewares) {
    this._createEndpoint(path, method, ...middlewares);

    return this;
  };
});

module.exports = BaseApp;
