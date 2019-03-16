module.exports.toArray = value => Array.isArray(value) ? value : [value];
module.exports.isRPCAction = message => typeof message === 'object' && typeof message.server === 'object' && typeof message.server.action === 'string';
