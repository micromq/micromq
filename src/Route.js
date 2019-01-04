const pathToRegExp = require('path-to-regexp');

class Route {
  constructor(path, method, middleware) {
    this._paramNames = [];

    this.method = method;
    this.middleware = middleware;
    this.regexp = pathToRegExp(path, this._paramNames);
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
