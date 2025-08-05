const assert = require('assert');
const Module = require('module');

async function testAwsNotification() {
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

  await awsNotification.sendNotification({
    userid: 'user1',
    location: 'Sydney',
    currentDt: Date.now(),
    message: 'Temperature alert'
  });

  assert(sendMsgCalled, 'sendMsg should be called');
  assert(redisSetCalled, 'redis set should be called');
}

async function testFractionalTemperatureTriggersAlert() {
  const originalRequire = Module.prototype.require;
  let handler;
  let notificationCalled = false;

  Module.prototype.require = function(request) {
    if (request === './connections') {
      return {
        redisSubscriber: {
          on: (event, h) => {
            if (event === 'message') handler = h;
          },
          subscribe: () => {}
        },
        asyncRedisClient: { get: async () => null }
      };
    }
    if (request === './aws-notification') {
      return { sendNotification: () => { notificationCalled = true; } };
    }
    return originalRequire.apply(this, arguments);
  };

  process.env.MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION = '0';
  process.env.TEMPERATURE_THRESHOLD_IN_CELSIUS = '25';
  delete require.cache[require.resolve('./index.js')];
  require('./index.js');
  Module.prototype.require = originalRequire;

  const message = JSON.stringify({
    userid: 'user1',
    location: 'Sydney',
    current_temperature: 25.6
  });
  await handler('insert', message);

  assert(notificationCalled, 'Notification should be sent for fractional temperature above threshold');
}

async function run() {
  await testAwsNotification();
  await testFractionalTemperatureTriggersAlert();
  console.log('All tests passed');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
