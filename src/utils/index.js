module.exports.toArray = value => Array.isArray(value) ? value : [value];
module.exports.isRpcAction = message => typeof message === 'object' && typeof message.server === 'object' && typeof message.server.action === 'string';
