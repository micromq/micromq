const { expect } = require('chai');
const Gateway = require('../../gateway');

describe('Gateway', () => {
  const error = 'Gateway must have at least one microservice';

  it('constructor => empty options', () => {
    expect(() => new Gateway()).to.throw(error);
  });

  it('constructor => microservices is not an array', () => {
    expect(() => new Gateway({microservices: {}})).to.throw(error);
  });

  it('constructor => empty array of microservices', () => {
    expect(() => new Gateway({microservices: []})).to.throw(error);
  });
});
