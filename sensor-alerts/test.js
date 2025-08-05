const assert = require('assert');
const Module = require('module');

const originalRequire = Module.prototype.require;
let sendMsgCalled = false;
let redisSetCalled = false;

Module.prototype.require = function(request) {
  if (request === 'aws-sns-sms') {
    return function(config, msg) {
      sendMsgCalled = true;
      return Promise.resolve();
    };
  }
  if (request === './email-sender') {
    return { sendEmailAlert: () => Promise.resolve() };
  }
  if (request === './connections') {
    return { asyncRedisClient: { set: async () => { redisSetCalled = true; } } };
  }
  return originalRequire.apply(this, arguments);
};

const awsNotification = require('./aws-notification');

Module.prototype.require = originalRequire;

process.env.ENABLE_SMS_ALERTS = 'true';

async function run() {
  await awsNotification.sendNotification({
    userid: 'user1',
    location: 'Sydney',
    currentDt: Date.now(),
    message: 'Temperature alert'
  });
  assert(sendMsgCalled, 'sendMsg should be called');
  assert(redisSetCalled, 'redis set should be called');
  console.log('All tests passed');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
