const MicroMQ = require('../src/MicroService');

const app = new MicroMQ({
  name: 'users',
  rabbit: {
    url: process.env.RABBIT_URL,
  },
});

app.use(async (req, res, next) => {
  req.session.timestamp = Date.now();

  await next();
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

app.get('/users/me', (req, res) => {
  res.json({
    id: +req.cookies.id,
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
  }, 15000);
});

app.start();
