const debug = require('./utils/debug')('micromq-response');

class Response {
  constructor(responsesChannel, responsesQueueName, requestId) {
    this.statusCode = 200;
    this.headers = {};

    this._responsesChannel = responsesChannel;
    this._responsesQueueName = responsesQueueName;
    this._requestId = requestId;
  }

  _send(response) {
    this.response = response;

    debug(() => `sending response to ${this._responsesQueueName}: ${JSON.stringify({
      response,
      statusCode: this.statusCode,
      headers: this.headers,
      requestId: this._requestId,
    })}`);

    this._responsesChannel.sendToQueue(this._responsesQueueName, Buffer.from(JSON.stringify({
      response,
      statusCode: this.statusCode,
      headers: this.headers,
      requestId: this._requestId,
    })));
  }

  status(statusCode) {
    this.statusCode = statusCode;

    return this;
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    this.headers = headers;

    return this;
  }

  end(response) {
    this._send(response);

    return this;
  }

  json(response) {
    this.writeHead(this.statusCode, {
      ...this.headers,
      'Content-Type': 'application/json',
    });
    this._send(response);

    return this;
  }
}

module.exports = Response;
