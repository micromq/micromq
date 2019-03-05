[![micromq](https://img.shields.io/npm/v/micromq.svg?style=flat-square)](https://www.npmjs.com/package/micromq/)

# micromq

Microservice framework based on native Node.js HTTP module and AMQP protocol (express integration as feature). 🔬 🐇

## Install

```sh
$ npm i micomq
```

## Tests

```sh
$ RABBIT_URL=amqp://localhost node examples/users.js &
$ RABBIT_URL=amqp://localhost node examples/balances.js &
$ RABBIT_URL=amqp://localhost PORT=3000 node examples/gateway.js &
$ PORT=3000 npm test
```

## API

### Gateway

#### .constructor(options)

* `options` <Object>
    * `microservices` <Array<string>> Microservices for connect.
    * `rabbit` <Object>
        * `url` <string> RabbitMQ connection url.
    * `requests` <?Object>
        * `timeout` <?number> Timeout for each request (in ms).

```js
const Gateway = require('micromq/gateway');

const gateway = new Gateway({
  microservices: ['users', 'orders'],
  rabbit: {
    url: 'amqp://localhost:5672',
  },
  requests: {
    timeout: 5000,
  },
});
```

This method creates gateway.

#### .action(name, handler)

* `name` <string> Action name
* `handler` <function> Action handler

This methods creates RPC action.

```js
const Gateway = require('micromq/gateway');
const { Users } = require('./db');

const gateway = new Gateway({ ... });

gateway.action('increase_balance', async (meta) => {
  await Users.updateOne({
    userId: meta.userId,
  }, {
    $inc: {
      balance: meta.amount,
    },
  });
  
  // send response to the client
  return [200, { ok: true }];
  
  // via shortcut with default status code = 200
  return { ok: true };
});
```

```js
const MicroMQ = require('micromq');

const app = new MicroMQ({ ... });

app.post('/deposit', (req, res) => {
  // send rpc action to the gateway
  res.json({
    server: {
      action: 'increase_balance',
      meta: {
        userId: 1,
        amount: 500,
      },
    },
  });
});

app.start();
```

#### .use(...middlewares)

* `...middlewares` <...function> Middlewares

#### .all(path, ...middlewares)

* `path` <string> Endpoint path
* `...middlewares` <...function> Middlewares

This method creates endpoint for all HTTP-methods.

#### .options(path, ...middlewares),
#### .get(path, ...middlewares),
#### .post(path, ...middlewares),
#### .put(path, ...middlewares),
#### .patch(path, ...middlewares),
#### .delete(path, ...middlewares)

* `path` <string> Endpoint path
* `...middlewares` <...function> Middlewares

This method creates endpoint with needed method.

#### .middleware()

* returns: <function>

This method returns middleware for express.

```js
const express = require('express');
const bodyParser = require('body-parser');
const Gateway = require('micromq/gateway');
const users = require('./routers/users');

const app = express();
const gateway = new Gateway({ ... });

app.use(bodyParser.json());

// apply middleware
app.use(gateway.middleware());

// monolith router
app.use('/users', users);

// delegate requests to the microservice
app.use('/orders', (req, res) => res.delegate('orders'));
```

#### .listen(port)

* `port` <number> Port for listen.

This method creates HTTP-server and starts listen needed port.

### MicroMQ

#### .constructor(options)

* `options` <Object>
    * `name` <string> Microservice name
    * `rabbit` <Object>
        * `url` <string> RabbitMQ connection url.

This method creates microservice.

```js
const MicroMQ = require('micromq');

const app = new MicroMQ({
  microservice: 'users',
  rabbit: {
    url: 'amqp://localhost:5672',
  },
});
```

#### .use(...middlewares)

* `...middlewares` <...function> Middlewares

#### .all(path, ...middlewares)

* `path` <string> Endpoint path
* `...middlewares` <...function> Middlewares

This method creates endpoint for all HTTP-methods.

#### .options(path, ...middlewares),
#### .get(path, ...middlewares),
#### .post(path, ...middlewares),
#### .put(path, ...middlewares),
#### .patch(path, ...middlewares),
#### .delete(path, ...middlewares)

* `path` <string> Endpoint path
* `...middlewares` <...function> Middlewares

This method creates endpoint with needed method.

#### .ask(name, query)

* `name` <string> Microservice for ask
* `query` <Object>
    * `path` <?string> Endpoint path
    * `method` <?string> Endpoint method
    * `query` <?Object> Query params
    * `params` <?Object> URL params
    * `body` <?Object> Body params
* returns: <Promise<Object>> { status: <number>, response: <any> }

This method asks other microservice.

```js
const MicroMQ = require('micromq');

const app = new MicroMQ({ ... });

app.get('/users/me/info', async (req, res) => {
  const { response } = await app.ask('balances', {
    path: '/balances/me',
    method: 'get',
    params: {
      userId: req.params.id,
    },
  });
  
  res.json({
    id: req.params.id,
    name: `${req.session.first_name} ${req.session.last_name}`,
    balance: response.amount,
  });
});

app.start();
```

#### .start()

This method starts microservice.

## License

MIT.
