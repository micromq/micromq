const methods = require('methods');
const BaseService = require('./BaseService');
const Response = require('./Response');
const Route = require('./Route');

class MicroService extends BaseService {
  constructor(options) {
    super(options);

    this.routes = [];
  }

  _createRoute(path, method, middleware) {
    this.routes.push(
      new Route(path, method, middleware),
    );
  }

  async _handler({ path, method, payload, requestId }) {
    const route = this.routes.find(item => item.match(path, method));

    if (!route) {
      return;
    }

    const responsesChannel = await this.createResponsesChannel();
    const response = new Response(responsesChannel, this.responsesQueueName, requestId);
    const params = route.params(path);

    await route.middleware({
      ...payload,
      params,
    }, response);
  }

  all(path, middleware) {
    this._createRoute(path, undefined, middleware);
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
    this._createRoute(path, method, middleware);
  };
});

module.exports = MicroService;
