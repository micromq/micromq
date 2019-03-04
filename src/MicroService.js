const BaseApp = require('./BaseApp');
const Response = require('./Response');

class MicroService extends BaseApp {
  constructor(options) {
    super(options);
  }

  async _handler({ requestId, ...request }) {
    const responsesChannel = await this.createResponsesChannel();
    const response = new Response(responsesChannel, this.responsesQueueName, requestId);

    return this._next(request, response);
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

module.exports = MicroService;
