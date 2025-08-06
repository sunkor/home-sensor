const assert = require('assert');
const http = require('http');
const Module = require('module');

const originalRequire = Module.prototype.require;
Module.prototype.require = function(request) {
  if (request === '../config/config') {
    return {
      MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION: 0,
      TEMPERATURE_THRESHOLD_IN_CELSIUS: 25,
      INFLUX_HOST: 'influxdb',
      INFLUX_PORT: 8086,
      REDIS_HOST: 'redis',
      REDIS_PORT: 6379
    };
  }
  return originalRequire.apply(this, arguments);
};

const { validatePayload, app } = require('./index');
Module.prototype.require = originalRequire;

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

async function testHealthEndpoint() {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      http.get(`http://127.0.0.1:${port}/health`, res => {
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });
        res.on('end', () => {
          server.close();
          try {
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(data, '{"status":"ok"}');
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      }).on('error', err => {
        server.close();
        reject(err);
      });
    });
  });
}

async function run() {
  testInvalidPayload();
  testValidPayload();
  await testHealthEndpoint();
  console.log('All tests passed');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
