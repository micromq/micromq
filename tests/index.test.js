const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

const { expect } = chai;
const request = chai.request(`http://localhost:${process.env.PORT}`);

describe('gateway & microservice', async () => {
  it('should send response', async () => {
    const { status, body } = await request.get('/users/1');

    expect(status).to.be.equal(200);
    expect(body).to.be.an('object').to.have.all.keys(['id', 'time', 'firstName', 'lastName']);
    expect(body.id).to.be.equal('1');
    expect(body.time).to.be.a('number');
    expect(body.firstName).to.be.equal('Mikhail');
    expect(body.lastName).to.be.equal('Semin');
  });

  it('should trigger auth middleware and send 200 response', async () => {
    const { status, body } = await request.get('/users/1/comments');

    expect(status).to.be.equal(200);
    expect(body).to.be.deep.equal([
      {
        id: 1,
        text: 'The best Node.js articles',
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
