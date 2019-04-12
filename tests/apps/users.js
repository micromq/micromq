const MicroMQ = require('../../src/MicroService');

const app = new MicroMQ({
  name: 'users',
  microservices: ['balances'],
  rabbit: {
    url: process.env.RABBIT_URL,
  },
});

app.on('error', (err, req, res) => {
  console.error(err);
});

app.action('new_deposit', (meta, res) => {
  if (meta.amount <= 0) {
    res.status(400);
    res.json({ error: 'Wrong amount' });

    return;
  }

  res.json({ ok: true });
});

app.use(async (req, res, next) => {
  req.session.timestamp = Date.now();

  try {
    await next();
  } catch (err) {
    res.status(err.status || 500);
    res.json({ error: err.message || 'Server error' });

    app.emit('error', err, req, res);
  }
});

app.post('/users/throw', () => {
  throw 'Random error!';
});

app.post('/users/login', (req, res) => {
  res.json({
    server: {
      action: 'authorize',
      meta: {
        userId: req.body.userId,
      },
    },
  });
});

app.get('/users/:id', async (req, res) => {
  const { id: paramId } = req.params;
  const { id: cookieId } = req.cookies;
  const userId = Number.isNaN(+paramId) ? +cookieId : +paramId;

  const { response } = await app.ask('balances', {
    path: '/balances/me',
    method: 'get',
    query: {
      id: userId,
    },
  });

  res.json({
    id: userId,
    balance: response.amount,
    firstName: 'Mikhail',
    lastName: 'Semin',
    timestamp: req.session.timestamp,
  });
});

app.get('/users/me/posts', (req, res) => {
  setTimeout(() => {
    res.json([
      {
        id: 1,
        text: 'Event loop latency',
      },
      {
        id: 2,
        text: 'HR recommendations',
      },
    ]);
  }, 5000);
});

if (process.env.STANDALONE === 'true') {
  app.listen(process.env.PORT);
} else {
  app.start();
}
