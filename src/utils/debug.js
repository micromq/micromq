const debug = require('debug');

module.exports = (namespace) => {
  const log = debug(namespace);

  return (fn) => {
    if (log.enabled) {
      log(fn());
    }
  };
};
