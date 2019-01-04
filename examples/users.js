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

app.get('/users/:id', (req, res) => {
  res.json({
    id: req.params.id,
    firstName: 'Mikhail',
    lastName: 'Semin',
  });
});

app.start();

module.exports = app;
