const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

const { expect } = chai;
const request = chai.request(`http://localhost:${process.env.PORT}`);

describe('gateway & microservice', async () => {
  it('should send response as json', async () => {
    const { status, body } = await request.get('/users/1');

    expect(status).to.be.equal(200);
    expect(body).to.be.deep.equal({
      id: '1',
      firstName: 'Mikhail',
      lastName: 'Semin',
    });
  });

  it('should send response as text', async () => {
    const { status, text } = await request.get('/');

    expect(status).to.be.equal(200);
    expect(text).to.be.equal('Hello, world!');
  });

  it('should trigger auth middleware and send 200 response', async () => {
    const { status, body } = await request.get('/users/1/comments');

    expect(status).to.be.equal(200);
    expect(body).to.be.deep.equal([
      {
        id: 1,
        text: 'Thr best Node.js articles',
      },
      {
        id: 2,
        text: 'My first job',
      },
    ]);
  });

  it('should trigger auth middleware and send 401 response', async () => {
    const { status, body } = await request.get('/users/2/comments');

    expect(status).to.be.equal(401);
    expect(body).to.be.deep.equal({
      error: 'Access Denied',
    });
  });
});
