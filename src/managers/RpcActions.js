class RpcActions {
  constructor() {
    this._actions = new Map();
  }

  add(name, handler) {
    this._actions.set(name, handler);
  }

  async handle(req, res) {
    const { action, meta } = req.server;
    const handler = this._actions.get(action);

    if (!handler) {
      console.warn(`Action "${action}" not found`, message);

      return;
    }

    await handler(meta, res);
  }
}

module.exports = RpcActions;
