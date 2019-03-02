const MicroMQ = require('../src/MicroService');

const app = new MicroMQ({
  name: 'users',
  rabbit: {
    url: process.env.RABBIT_URL,
  },
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

app.get('/users/:id', (req, res) => {
  res.json({
    id: req.params.id,
    time: req.session.time,
    firstName: 'Mikhail',
    lastName: 'Semin',
  });
});

app.get(
  '/users/:id/comments',
  async (req, res, next) => {
    if (+req.params.id !== 1) {
      res.writeHead(401);
      res.json({ error: 'Access Denied' });

      return;
    }

    await next();
  },
  (req, res) => {
    res.json([
      {
        id: 1,
        text: 'The best Node.js articles',
      },
      {
        id: 2,
        text: 'My first job',
      },
    ]);
  },
);

app.start();
