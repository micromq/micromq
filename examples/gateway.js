const Gateway = require('../gateway');

const app = new Gateway({
  requests: {
    timeout: 10000,
  },
  microservices: ['users', 'balances'],
  rabbit: {
    url: process.env.RABBIT_URL,
  },
});

app.action('authorize', (meta) => {
  if (meta.userId !== 1) {
    return [400, { error: 'Access denied' }];
  }

  return { isAuthorized: true };
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
