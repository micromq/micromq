const Gateway = require('../gateway');

const app = new Gateway({
  microservices: ['users'],
  rabbit: {
    url: process.env.RABBIT_URL,
  },
});

app.use((req, res) => {
  res.delegate('users');
});

app.listen(process.env.PORT);
