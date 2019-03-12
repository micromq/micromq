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

- `options` <[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>
  - `microservices` <[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)<[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)>> Microservices for connect.
  - `rabbit` <[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>
    - `url` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> RabbitMQ connection url.
  - `requests` <[?Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>
    - `timeout` <[?number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type)> Timeout for each request (in ms).


This method creates gateway.

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

#### .action(name, handler)

- `name` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Action name
- `handler` <[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function)> Action handler

This method creates RPC action.

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

gateway.listen(3000);
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

#### .on(name, handler)

- `name` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Event name
- `handler` <[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function)> event handler

This method creates application event ([read more](https://github.com/koajs/koa/wiki/Error-Handling)).

```js
const MicroMQ = require('micromq');

const app = new MicroMQ({ ... });

// register event
app.on('error', (err, req, res) => {
  console.error(err); // 'Random error!'
});

app.use(async (req, res, next) => {
  try {
    await next();
  } catch (err) {
    res.status(err.status || 500);
    res.json({ error: err.message || 'Server error' });

    // emit event
    app.emit('error', err, req, res);
  }
});

app.post('/throw', (req, res) => {
  throw 'Random error!';
});

app.start();
```

#### .emit(name, ...args)

- `name` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Event name
- `...args` <...any> - Arguments

This method emits application event. 

#### .enablePrometheus(credentials)

- `credentials` <[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)> Credentials for prometheus target
  - `user` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)>
  - `password` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)>
  
This method enables prometheus monitoring and adds `/metrics` endpoint.

#### .use(...middlewares)

- `...middlewares` <...[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function)> Middlewares

This method adds middlewares.

#### .all(path, ...middlewares)

- `path` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Endpoint path
- `...middlewares` <...[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function)> Middlewares

This method creates endpoint for all HTTP-methods.

#### .options(path, ...middlewares),
#### .get(path, ...middlewares),
#### .post(path, ...middlewares),
#### .put(path, ...middlewares),
#### .patch(path, ...middlewares),
#### .delete(path, ...middlewares)

- `path` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Endpoint path
- `...middlewares` <...[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function)> Middlewares

This method creates endpoint with needed method.

#### .middleware()

- returns: <[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function)>

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

- `port` <[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type)> Port for listen.

This method creates HTTP-server and starts listen needed port.

### MicroMQ

#### .constructor(options)

- `options` <[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>
    - `name` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Microservice name
    - `rabbit` <[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>
        - `url` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> RabbitMQ connection url.

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

- `...middlewares` <...[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function)> Middlewares

This method adds middlewares.

#### .all(path, ...middlewares)

- `path` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Endpoint path
- `...middlewares` <...[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function)> Middlewares

This method creates endpoint for all HTTP-methods.

#### .options(path, ...middlewares),
#### .get(path, ...middlewares),
#### .post(path, ...middlewares),
#### .put(path, ...middlewares),
#### .patch(path, ...middlewares),
#### .delete(path, ...middlewares)

- `path` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Endpoint path
- `...middlewares` <...[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function)> Middlewares

This method creates endpoint with needed method.

#### .ask(name, query)

- `name` <[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Microservice for ask
- `query` <[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>
    - `path` <[?string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Endpoint path
    - `method` <[?string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type)> Endpoint method
    - `query` <[?Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)> Query params
    - `params` <[?Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)> URL params
    - `body` <[?Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)> Body params
- returns: <[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>> { status: <[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type)>, response: \<any\> }

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
