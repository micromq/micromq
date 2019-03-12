module.exports.getUser = {
  type: 'object',
  required: [
    'id',
    'balance',
    'firstName',
    'lastName',
    'timestamp',
  ],
  properties: {
    id: {
      type: 'number',
    },
    balance: {
      type: 'number',
    },
    firstName: {
      type: 'string',
    },
    lastName: {
      type: 'string',
    },
    timestamp: {
      type: 'number',
    },
  },
};
