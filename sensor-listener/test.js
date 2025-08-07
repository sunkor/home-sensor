const assert = require('assert');
const http = require('http');
const Module = require('module');

const originalRequire = Module.prototype.require;
Module.prototype.require = function(request) {
  if (request === '../config/config') {
    return {
      MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION: 0,
      TEMPERATURE_THRESHOLD_IN_CELSIUS: 25,
      RATE_LIMIT_WINDOW_MS: 1000,
      RATE_LIMIT_MAX_REQUESTS: 1,
      INFLUX_HOST: 'influxdb',
      INFLUX_PORT: 8086,
      REDIS_HOST: 'redis',
      REDIS_PORT: 6379
    };
  }
  if (request === 'redis') {
    return {
      createClient: () => ({
        connect: async () => {},
        duplicate: () => ({
          connect: async () => {},
          publish: async () => {}
        }),
        get: async () => null
      })
    };
  }
  if (request === 'influx') {
    return {
      InfluxDB: class {
        async writePoints() {}
      },
      FieldType: { FLOAT: 'float' }
    };
  }
  if (request === 'express-rate-limit') {
    return (opts) => {
      const hits = {};
      return (req, res, next) => {
        const key = (opts.keyGenerator && opts.keyGenerator(req)) || req.ip;
        const now = Date.now();
        const item = hits[key] || { count: 0, start: now };
        if (now - item.start >= opts.windowMs) {
          item.count = 0;
          item.start = now;
        }
        item.count += 1;
        hits[key] = item;
        if (item.count > opts.max) {
          res.status(429).send('Too many requests');
          return;
        }
        next();
      };
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

async function testAbortWhenRedisUnreachable() {
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function(request) {
    if (request === '../config/config') {
      return {
        INFLUX_HOST: 'influxdb',
        INFLUX_PORT: 8086,
        REDIS_HOST: 'redis',
        REDIS_PORT: 6379
      };
    }
    if (request === 'redis') {
      return {
        createClient: () => ({
          connect: async () => { throw new Error('fail'); },
          duplicate: () => ({ connect: async () => { throw new Error('fail'); } })
        })
      };
    }
    if (request === 'influx') {
      return {
        InfluxDB: class {},
        FieldType: { FLOAT: 'float' }
      };
    }
    return originalRequire.apply(this, arguments);
  };

  const originalExit = process.exit;
  let exitCode = null;
  process.exit = (code) => { exitCode = code; };

  delete require.cache[require.resolve('./common.js')];
  require('./common');
  await new Promise((resolve) => setImmediate(resolve));

  process.exit = originalExit;
  Module.prototype.require = originalRequire;

  assert.strictEqual(exitCode, 1, 'process should exit when Redis is unreachable');
}

function testInvalidTemperature() {
  const { res, next, wasNextCalled } = createMock();
  const req = { body: { temperature: 'hot', location: 'Sydney' } };
  validatePayload(req, res, next);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body, 'Invalid payload');
  assert.strictEqual(wasNextCalled(), false);
}

function testInvalidLocation() {
  const { res, next, wasNextCalled } = createMock();
  const req = { body: { temperature: 25.5 } };
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

async function testRateLimit() {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      const options = {
        hostname: '127.0.0.1',
        port,
        path: '/temperature_data',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          userid: 'user1'
        }
      };

      const makeRequest = () =>
        new Promise((res, rej) => {
          const req = http.request(options, response => {
            let body = '';
            response.on('data', chunk => {
              body += chunk;
            });
            response.on('end', () => {
              res({ status: response.statusCode, body });
            });
          });
          req.on('error', rej);
          req.write(
            JSON.stringify({ temperature: 30, location: 'Sydney', userid: 'user1' })
          );
          req.end();
        });

      (async () => {
        try {
          await makeRequest();
          const second = await makeRequest();
          server.close();
          assert.strictEqual(second.status, 429);
          resolve();
        } catch (err) {
          server.close();
          reject(err);
        }
      })();
    });
  });
}

async function run() {
  await testAbortWhenRedisUnreachable();
  testInvalidTemperature();
  testInvalidLocation();
  testValidPayload();
  await testHealthEndpoint();
  await testRateLimit();
  console.log('All tests passed');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
