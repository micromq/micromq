const pathToRegExp = require('path-to-regexp');

class Route {
  constructor(path, method, middlewares) {
    this._paramNames = [];

    this.method = method;
    this.middlewares = middlewares.map((middleware, index) => {
      return (req, res) => middleware(req, res, () => this._next(req, res, index));
    });
    this.regexp = pathToRegExp(path, this._paramNames);
  }

  _next(req, res, index = -1) {
    if (this.middlewares.length > index + 1) {
      return this.middlewares[index + 1](req, res);
    }
  }

  _decodeURIComponent(string) {
    try {
      return decodeURIComponent(string);
    } catch (err) {
      return string;
    }
  }

  match(path, method) {
    return this.regexp.test(path) && (!this.method || this.method === method);
  }

  params(path) {
    const captures = path.match(this.regexp).slice(1);

    return this._paramNames.reduce((object, param, index) => ({
      ...object,
      [param.name]: this._decodeURIComponent(captures[index]),
    }), {});
  }
}

module.exports = Route;
