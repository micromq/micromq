const qs = require('querystring');
const parse = require('co-body');

module.exports.prepareRequest = async (req, res, next) => {
  const [, queryString] = req.url.split('?');
  const query = qs.decode(queryString);
  const body = await parse.json(req);

  req.path = (req.originalUrl || req.url).split('?')[0];
  req.method = req.method.toLowerCase();
  req.body = body;
  req.query = query;
  req.params = {};
  req.session = {};

  await next();
};
