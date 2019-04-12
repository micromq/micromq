const http = require('http');
const cookieParser = require('cookie-parser');
const { prepareRequest, upgradeServerResponse } = require('./middlewares');
const BaseApp = require('./BaseApp');
const debug = require('./utils/debug')('micromq-server');

class Server extends BaseApp {
  constructor(options = { name: 'test-app' }) {
    super(options);

    this.use(cookieParser());
    this.use(prepareRequest);
    this.use(upgradeServerResponse);
  }

  createServer(port) {
    debug(() => `starting to listen ${port} port`);

    return http
      .createServer((req, res) => this._next(req, res))
      .listen(port);
  }
}

module.exports = Server;
