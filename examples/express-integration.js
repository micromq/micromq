const express = require('express');
const Gateway = require('../gateway');

const gateway = new Gateway({
  microservices: ['users'],
  rabbit: {
    url: process.env.RABBIT_URL,
  },
});
const app = express();

app.use(gateway.middleware());

app.get('/balance', (req, res) => {
  res.json({
    amount: 500,
  });
});

app.get(['/friends', '/status'], async (req, res) => {
  await res.delegate('users');
});

app.listen(process.env.PORT);
