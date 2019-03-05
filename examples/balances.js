const MicroMQ = require('../src/MicroService');

const app = new MicroMQ({
  name: 'balances',
  rabbit: {
    url: process.env.RABBIT_URL,
  },
});

const db = {
  1: 100,
  2: 500,
  3: 1000,
  4: 912,
  5: 1032,
};

app.get('/balances/me', (req, res) => {
  const { id } = req.query;

  res.json({
    amount: db[id],
  })
});

app.start();
