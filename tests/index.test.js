const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiJsonSchema = require('chai-json-schema');

chai.use(chaiHttp);
chai.use(chaiJsonSchema);

const { expect } = chai;
const request = chai.request(`http://localhost:${process.env.PORT}`);

describe('gateway & microservice', async () => {
  it('should send response', async () => {
    const { status, body } = await request
      .get('/users/me')
      .set('Cookie', 'id=1');

    expect(status).to.be.equal(200);
    expect(body).to.be.jsonSchema({
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
    });
  });

  it('should send response with url which ends on the slash', async () => {
    const { status, body } = await request
      .get('/users/me/')
      .set('Cookie', 'id=1');

    expect(status).to.be.equal(200);
    expect(body).to.be.an('object');
  });

  it('should trigger rpc-action (negative case)', async () => {
    const { status, body } = await request
      .post('/users/login')
      .send({ userId: 123 });

    expect(status).to.be.equal(400);
    expect(body).to.be.deep.equal({
      error: 'Access denied',
    });
  });

  it('should trigger rpc-action (positive case)', async () => {
    const { status, body } = await request
      .post('/users/login')
      .send({ userId: 1 });

    expect(status).to.be.equal(200);
    expect(body).to.be.deep.equal({
      isAuthorized: true,
    });
  });

  it('should send timed out error', async () => {
    const { status, body } = await request.get('/users/me/posts');

    expect(status).to.be.equal(408);
    expect(body).to.be.deep.equal({
      error: 'Timed out',
    });
  });

  it('should send response with server error', async () => {
    const { status, body } = await request.post('/users/throw');

    expect(status).to.be.equal(500);
    expect(body).to.be.deep.equal({ error: 'Server error' });
  });
});
