const assert = require('assert');

process.env.MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION = '0';
process.env.TEMPERATURE_THRESHOLD_IN_CELSIUS = '25';

const { validatePayload } = require('./index');

function createMock() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(msg) {
      this.body = msg;
    }
  };
  let nextCalled = false;
  return {
    res,
    next: () => {
      nextCalled = true;
    },
    wasNextCalled: () => nextCalled
  };
}

function testInvalidPayload() {
  const { res, next, wasNextCalled } = createMock();
  const req = { body: { temperature: 'hot', location: 'Sydney' } };
  validatePayload(req, res, next);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body, 'Invalid payload');
  assert.strictEqual(wasNextCalled(), false);
}

function testValidPayload() {
  const { res, next, wasNextCalled } = createMock();
  const req = { body: { temperature: 25.5, location: 'Sydney' } };
  validatePayload(req, res, next);
  assert.strictEqual(res.statusCode, null);
  assert.strictEqual(wasNextCalled(), true);
}

function run() {
  testInvalidPayload();
  testValidPayload();
  console.log('All tests passed');
  process.exit(0);
}

run();
