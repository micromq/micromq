const Gateway = require('../gateway');
const users = require('./users');

const app = new Gateway({
  microservices: {
    users,
  },
});

app.use((req, res) => {
  res.delegate('users');
});

app.listen(process.env.PORT);
