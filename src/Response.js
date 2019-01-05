class Response {
  constructor(responsesChannel, responsesQueueName, requestId) {
    this.statusCode = 200;
    this.headers = {};

    this._responsesChannel = responsesChannel;
    this._responsesQueueName = responsesQueueName;
    this._requestId = requestId;
  }

  _send(response) {
    this._responsesChannel.sendToQueue(this._responsesQueueName, Buffer.from(JSON.stringify({
      response,
      statusCode: this.statusCode,
      headers: this.headers,
      requestId: this._requestId,
    })));
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    this.headers = headers;
  }

  end(response) {
    this._send(response);
  }

  json(response) {
    this.writeHead(this.statusCode, {
      ...this.headers,
      'Content-Type': 'application/json',
    });
    this._send(JSON.stringify(response));
  }
}

module.exports = Response;
