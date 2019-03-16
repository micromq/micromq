const Gateway = require('../gateway');

const app = new Gateway({
  microservices: ['users'],
  rabbit: {
    url: process.env.RABBIT_URL,
  },
});

app.get(['/friends', '/status'], async (req, res) => {
  await res.delegate('users');
});

app.listen(process.env.PORT);
