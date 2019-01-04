const methods = require('methods');
const BaseService = require('./BaseService');
const Response = require('./Response');

class MicroService extends BaseService {
  constructor(options) {
    super(options);

    this.routes = [];
  }

  _createRoute(method, path, middleware) {
    this.routes.push({
      method,
      path,
      middleware,
    });
  }

  async _handler({ path, method, payload, requestId }) {
    const middleware = this.routes.find(item => item.path === path && item.method === method);

    if (!middleware) {
      return;
    }

    const responsesChannel = await this.createResponsesChannel();
    const response = new Response(responsesChannel, this.responsesQueueName, requestId);

    await middleware.middleware(payload, response);
  }

  all(path, middleware) {
    this._createRoute(undefined, path, middleware);
  }

  async start() {
    const requestsChannel = await this.createRequestsChannel();

    requestsChannel.consume(this.options.requestsQueueName, async (message) => {
      if (!message) {
        return;
      }

      await this._handler(JSON.parse(message.content.toString()));

      requestsChannel.ack(message);
    });
  }
}


methods.forEach((method) => {
  MicroService.prototype[method] = function(path, middleware) {
    this._createRoute(method, path, middleware);
  };
});

module.exports = MicroService;
