const assert = require('assert');
const Module = require('module');

process.env.MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION = '0';
process.env.TEMPERATURE_THRESHOLD_IN_CELSIUS = '25.5';

const originalRequire = Module.prototype.require;
let notifyCalled = false;
Module.prototype.require = function(request) {
  if (request === './aws-notification') {
    return { sendNotification: async () => { notifyCalled = true; } };
  }
  if (request === './connections') {
    return {
      asyncRedisClient: { get: async () => null },
      redisSubscriber: { on: () => {}, subscribe: () => {} }
    };
  }
  return originalRequire.apply(this, arguments);
};

const { handleMessage } = require('./index');
Module.prototype.require = originalRequire;

async function run() {
  notifyCalled = false;
  await handleMessage('insert', JSON.stringify({ userid: 'user1', location: 'home', current_temperature: 26.3 }));
  assert(notifyCalled, 'Alert should be sent for fractional temperature exceeding threshold');

  notifyCalled = false;
  await handleMessage('insert', JSON.stringify({ userid: 'user1', location: 'home', current_temperature: 24.8 }));
  assert(!notifyCalled, 'Alert should not be sent for temperature below threshold');

  console.log('All fractional tests passed');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
