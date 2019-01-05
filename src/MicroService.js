const methods = require('methods');
const BaseService = require('./BaseService');
const Response = require('./Response');
const Route = require('./Route');

class MicroService extends BaseService {
  constructor(options) {
    super(options);

    this.routes = [];
  }

  _createRoute(path, method, ...middlewares) {
    this.routes.push(
      new Route(path, method, middlewares),
    );
  }

  async _handler({ path, method, payload, requestId }) {
    const route = this.routes.find(item => item.match(path, method));

    const responsesChannel = await this.createResponsesChannel();
    const response = new Response(responsesChannel, this.responsesQueueName, requestId);

    if (!route) {
      response.writeHead(404);
      response.end('Not Found');

      return;
    }

    const request = {
      ...payload,
      params: route.params(path),
    };

    await route._next(request, response);
  }

  all(path, ...middlewares) {
    this._createRoute(path, undefined, ...middlewares);
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
  MicroService.prototype[method] = function(path, ...middlewares) {
    this._createRoute(path, method, ...middlewares);
  };
});

module.exports = MicroService;
