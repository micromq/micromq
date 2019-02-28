[![micromq](https://img.shields.io/npm/v/micromq.svg?style=flat-square)](https://www.npmjs.com/package/micromq/)

# micromq

Microservice framework based on native Node.js HTTP module and AMQP protocol. 🔬 🐇

## Install

```sh
$ npm i micomq -S
```

## Tests

```sh
$ RABBIT_URL=amqp://localhost node examples/users.js &
$ RABBIT_URL=amqp://localhost PORT=3000 node examples/gateway.js &
$ PORT=3000 npm test
```

## Usage

Gateway:

```js
const Gateway = require('micromq/gateway');

const app = new Gateway({
  // microservices names, later we can delegate requests on microservice
  microservices: ['users', 'orders', 'histories'],
  // rabbit options
  rabbit: {
    // url for connect to rabbit (see https://www.rabbitmq.com/uri-spec.html)
    url: 'amqp://localhost',
  },
});

// authentication middleware
app.use(async (req, res, next) => {
  // req is default http.ClientRequest
  // res is default http.ServerResponse
  // next is function for call next middleware
  
  if (!req.query.userId) {
    res.writeHead(401);
    res.end('Access Denied');
    
    return;
  }
  
  // search for user
  const user = await Users.findOne({
    userId: req.query.userId,
  });
  
  if (!user) {
    res.writeHead(404);
    res.end('User not found');
  
    return;
  }
  
  // save user into session
  req.session.user = user.toJSON();
  
  // call next middleware
  await next();
});

app.use((req, res) => {  
  // delegate request to users microservice
  if (req.url.startsWith('/users')) {
    return res.delegate('users');
  } 
  
  // delegate request to orders microservice
  if (req.url.startsWith('/orders')) {
    return res.delegate('orders');
  } 
  
  // delegate request to histories microservice
  if (req.url.startsWith('/histories')) {
    return res.delegate('histories');
  }
  
  // send 404 if microservice not found
  res.writeHead(404);
  res.end('Not Found');
});

// start http server and rabbit consumers
app.listen(process.env.PORT);
```

Microservice:

```js
const MicroMQ = require('micromq');

const app = new MicroMQ({
  // microservice name (later will be used in gateway)
  name: 'users',
  // rabbit options
  rabbit: {
    // url for connect to rabbit (see https://www.rabbitmq.com/uri-spec.html)
    url: 'amqp://localhost',
  },
});

// create route for get current user posts
app.get('/users/me/posts', async (req, res) => {
  // req = { query, body, headers, session, params }
  // res = { writeHead: Function, end: Function, json: Function }
  
  // get user id from session
  const { userId } = req.session.user;
  
  // search for user posts
  const posts = await Posts.find({ userId });
  
  // send posts as json with content-type application/json
  res.json(
    posts.map(post => post.toJSON()),
  );
});

// start microservice
app.start();
```

## Plans

- [x] Implement simple routing
- [x] Implement gateway class
- [x] Implement microservice class
- [x] Add examples
- [x] Improve message's data of request
- [x] Add documentation
- [x] Add tests
- [x] Improve routing (add support for regex and url params)
- [x] Add support for middlewares chain
- [ ] Add WebSockets support
- [ ] Add RPC-actions
- [ ] Add feature to set timeout for requests via options
- [ ] Add feature to set consumers count via gateway/microservice options

## License

MIT.
