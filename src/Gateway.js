const http = require('http');
const nanoid = require('nanoid');
const qs = require('querystring');
const parse = require('co-body');

class Gateway {
  constructor(options) {
    this.microservices = options.microservices;

    this._requests = new Map();
    this._consumersReady = false;
  }

  async _startConsumers() {
    if (this._consumersReady) {
      return;
    }

    await Promise.all(
      Object.values(this.microservices).map(async (microservice) => {
        const responsesChannel = await microservice.createResponsesChannel();

        responsesChannel.consume(microservice.responsesQueueName, (message) => {
          if (!message) {
            return;
          }

          const { requestId, response } = JSON.parse(message.content.toString());
          const res = this._requests.get(requestId);

          if (!res || !response) {
            return;
          }

          res.end(response);
          responsesChannel.ack(message);

          this._requests.delete(requestId);
        });
      }),
    );

    this._consumersReady = true;
  }

  use(handler) {
    this.handler = handler;
  }

  async listen(port) {
    await this._startConsumers();

    http
      .createServer(async (req, res) => {
        const [path, queryString] = req.url.split('?');
        const query = qs.decode(queryString);
        const body = await parse.json(req);

        req.body = body;
        req.query = query;

        res.delegate = async (name) => {
          const microservice = this.microservices[name];

          if (!microservice) {
            throw new Error(`Microservice ${name} not found`);
          }

          const requestsChannel = await microservice.createResponsesChannel();

          const message = {
            path,
            method: req.method.toLowerCase(),
            payload: {
              query,
              body,
              headers: req.headers,
            },
            requestId: nanoid(),
          };

          this._requests.set(message.requestId, res);

          requestsChannel.sendToQueue(microservice.requestsQueueName, Buffer.from(JSON.stringify(message)));
        };

        return this.handler(req, res);
      })
      .listen(port);
  }
}

module.exports = Gateway;
