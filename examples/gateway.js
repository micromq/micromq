const Gateway = require('../gateway');

const app = new Gateway({
  microservices: ['users'],
  rabbit: {
    url: process.env.RABBIT_URL,
  },
});

app.use(async (req, res, next) => {
  req.session.time = Date.now();

  await next();
});

app.use((req, res) => {
  if (!req.url.startsWith('/users')) {
    res.writeHead(404);
    res.end('Not Found');

    return;
  }

  res.delegate('users');
});

app.listen(process.env.PORT);
