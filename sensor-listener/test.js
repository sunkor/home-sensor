const assert = require('assert');
const Module = require('module');

process.env.MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION = '0';
process.env.TEMPERATURE_THRESHOLD_IN_CELSIUS = '25.5';

const originalRequire = Module.prototype.require;
let publishCalled = false;
Module.prototype.require = function(request) {
  if (request === './common' && this.id.endsWith('sensor-listener/index.js')) {
    return {
      asyncRedisClient: { get: async () => null },
      redisPublisher: { publish: () => { publishCalled = true; } },
      influx: {}
    };
  }
  return originalRequire.apply(this, arguments);
};

const { sendNotification } = require('./index');
Module.prototype.require = originalRequire;

async function run() {
  const req = { body: { temperature: 26.1, location: 'home' } };
  const res = {
    status(code) { this.statusCode = code; return this; },
    sendCalled: false,
    send(msg) { this.sendCalled = true; this.msg = msg; }
  };

  await sendNotification(req, res);
  assert(publishCalled, 'publish should be called for fractional temperature exceeding threshold');
  assert.strictEqual(res.msg, 'posted temperature data.');

  publishCalled = false;
  req.body.temperature = 24.9;
  await sendNotification(req, res);
  assert(!publishCalled, 'publish should not be called when temperature below threshold');
  console.log('All tests passed');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
