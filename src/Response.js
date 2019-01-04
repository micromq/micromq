class Response {
  constructor(responsesChannel, responsesQueueName, requestId) {
    this._responsesChannel = responsesChannel;
    this._responsesQueueName = responsesQueueName;
    this._requestId = requestId;
  }

  _send(response) {
    this._responsesChannel.sendToQueue(this._responsesQueueName, Buffer.from(JSON.stringify({
      response,
      requestId: this._requestId,
    })));
  }

  end(response) {
    this._send(response);
  }

  json(response) {
    this._send(JSON.stringify(response));
  }
}

module.exports = Response;
