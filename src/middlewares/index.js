const qs = require('querystring');
const parse = require('co-body');
const typeis = require('type-is');

module.exports.prepareRequest = async (req, res, next) => {
  const [, queryString] = req.url.split('?');
  const query = qs.decode(queryString);
  const istext = typeis(req, ['urlencoded', 'multipart']);
  const limit = req._options.fileUploadLimit || '1mb';
  const body = (!!istext === false) ? await parse.json(req) : await parse.form(req, {limit: limit});

  req.path = (req.originalUrl || req.url).split('?')[0];
  req.method = req.method.toLowerCase();
  req.body = body;
  req.query = query;
  req.params = {};
  req.session = {};

  await next();
};

module.exports.upgradeServerResponse = async (req, res, next) => {
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

  await next();
};
