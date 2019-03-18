class RpcActions {
  constructor() {
    this._actions = new Map();
  }

  add(name, handler) {
    this._actions.set(name, handler);
  }

  async handle(message) {
    const { action, meta } = message.server;
    const handler = this._actions.get(action);

    if (!handler) {
      console.warn(`Action "${action}" not found`, message);

      return;
    }

    const result = await handler(meta);
    const response = {};

    if (Array.isArray(result) && typeof result[0] === 'number' && result.length === 2) {
      response.statusCode = result[0];
      response.response = result[1];
    } else {
      response.statusCode = 200;
      response.response = result;
    }

    return response;
  }
}

module.exports = RpcActions;
