const methods = require('methods');
const pathToRegex = require('path-to-regexp');
const RabbitApp = require('./RabbitApp');
const { toArray } = require('./utils');

class BaseApp extends RabbitApp {
  constructor(options) {
    super(options);

    this._handlers = new Map();
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
    const paths = path && toArray(path).map(item => pathToRegex(item));

    middlewares.forEach((middleware) => {
      const idx = this._middlewares.length;

      this._middlewares.push({
        match: (req) => (!paths || paths.some(regex => regex.test(req.path))) && (!method || req.method === method),
        fn: (req, res) => middleware(req, res, () => this._next(req, res, idx)),
      });
    });
  }

  on(event, handler) {
    this._handlers.set(event, handler);

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
