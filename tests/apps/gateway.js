const Gateway = require('../../gateway');

const app = new Gateway({
  requests: {
    timeout: 3000,
  },
  microservices: ['users', 'balances'],
  rabbit: {
    url: process.env.RABBIT_URL,
  },
});

app.action('authorize', (meta, res) => {
  if (meta.userId !== 1) {
    res.status(400);
    res.json({ error: 'Access denied' });

    return;
  }

  res.writeHead(200, { 'Set-Cookie': `userId=${meta.userId}` });
  res.json({ isAuthorized: true });
});

app.all('/:microservice/(.*)', async (req, res) => {
  await res.delegate(req.params.microservice);
});

app.listen(process.env.PORT);
