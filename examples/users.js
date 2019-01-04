const MicroMQ = require('../src/MicroService');

const app = new MicroMQ({
  name: 'users',
  rabbit: {
    url: 'amqp://localhost',
  },
});

app.get('/', (req, res) => {
  res.end('Hello, world!');
});

app.get('/create', (req, res) => {
  res.json({
    ok: true,
  });
});

app.start();

module.exports = app;
