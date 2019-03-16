const MicroMQ = require('../src/MicroService');

const app = new MicroMQ({
  name: 'users',
  rabbit: {
    url: process.env.RABBIT_URL,
  },
});

app.get('/friends', (req, res) => {
  res.json([
    {
      id: 1,
      name: 'Mikhail Semin',
    },
    {
      id: 2,
      name: 'Ivan Ivanov',
    },
  ]);
});

app.get('/status', (req, res) => {
  res.json({
    text: 'Thinking...',
  });
});

app.start();
