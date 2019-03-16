const MicroMQ = require('../../src/MicroService');

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

app.post('/balances/deposit', async (req, res) => {
  const { amount } = req.body;

  const { status, response } = await app.ask('users', {
    server: {
      action: 'new_deposit',
      meta: {
        amount,
      },
    },
  });

  if (status === 200) {
    res.status(status).json({
      id: Math.random().toString().substr(2),
    });

    return;
  }

  res.status(status).json(response);
});

app.get('/balances/me', (req, res) => {
  const { id } = req.query;

  res.json({
    amount: db[id],
  })
});

app.start();
