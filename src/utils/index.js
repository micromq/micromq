module.exports.toArray = value => Array.isArray(value) ? value : [value];
module.exports.isRpcAction = message => typeof message === 'object' && typeof message.server === 'object' && typeof message.server.action === 'string';

module.exports.parseRabbitMessage = (message) => {
  if (!message) {
    return;
  }

  const content = message.content.toString();

  if (!content) {
    return;
  }

  let json;

  try {
    json = JSON.parse(content);
  } catch (err) {
    console.error('Cannot parse rabbit message', err);
  }

  return json;
};

module.exports.improveHttpResponse = (res) => {
  const writeHead = res.writeHead.bind(res);

  res.writeHead = function(statusCode, headers) {
    this.statusCode = statusCode;
    this.headers = headers;

    writeHead(statusCode, headers);

    return this;
  };

  res.status = function(statusCode) {
    this.statusCode = statusCode;

    return this;
  };

  res.json = function(response) {
    writeHead(this.statusCode, {
      ...this.headers,
      'Content-Type': 'application/json',
    });

    return this.end(JSON.stringify(response));
  };
};
