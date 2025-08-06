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
      return { redisClient: { set: async () => { redisSetCalled = true; } } };
    }
    if (request === '../config/config') {
      return {
        AWS_ACCESS_KEY: 'key',
        AWS_SECRET_KEY: 'secret',
        AWS_REGION: 'us-east-1',
        SMS_SENDER: 'sender',
        SMS_PHONE_NUMBER: '1234567890',
        ENABLE_SMS_ALERTS: true
      };
    }
    return originalRequire.apply(this, arguments);
  };

  const awsNotification = require('./aws-notification');
  Module.prototype.require = originalRequire;

  await awsNotification.sendNotification({
    userid: 'user1',
    location: 'Sydney',
    currentDt: Date.now(),
    message: 'Temperature alert'
  });

  assert(sendMsgCalled, 'sendMsg should be called');
  assert(redisSetCalled, 'redis set should be called');
}

async function testFractionalThresholdRespected() {
  const originalRequire = Module.prototype.require;
  let handler;
  let notificationCalled = false;

  Module.prototype.require = function(request) {
    if (request === './connections') {
      return {
        redisSubscriber: {
          subscribe: async (channel, h) => {
            if (channel === 'insert') handler = h;
          }
        },
        redisClient: { get: async () => null }
      };
    }
    if (request === './aws-notification') {
      return { sendNotification: () => { notificationCalled = true; } };
    }
    if (request === '../config/config') {
      return {
        MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION: 0,
        TEMPERATURE_THRESHOLD_IN_CELSIUS: 25.5
      };
    }
    return originalRequire.apply(this, arguments);
  };

  delete require.cache[require.resolve('./index.js')];
  require('./index.js');
  Module.prototype.require = originalRequire;

  let message = JSON.stringify({
    userid: 'user1',
    location: 'Sydney',
    current_temperature: 25.4
  });
  await handler(message);
  assert.strictEqual(
    notificationCalled,
    false,
    'Notification should not be sent below fractional threshold'
  );

  notificationCalled = false;
  message = JSON.stringify({
    userid: 'user1',
    location: 'Sydney',
    current_temperature: 25.6
  });
  await handler(message);
  assert(
    notificationCalled,
    'Notification should be sent above fractional threshold'
  );
}

async function testZeroTemperatureAccepted() {
  const originalRequire = Module.prototype.require;
  let handler;
  let warned = false;

  Module.prototype.require = function(request) {
    if (request === './connections') {
      return {
        redisSubscriber: {
          subscribe: async (channel, h) => {
            if (channel === 'insert') handler = h;
          }
        },
        redisClient: { get: async () => null }
      };
    }
    if (request === './aws-notification') {
      return { sendNotification: () => {} };
    }
    if (request === '../config/config') {
      return {
        MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION: 0,
        TEMPERATURE_THRESHOLD_IN_CELSIUS: 0
      };
    }
    return originalRequire.apply(this, arguments);
  };

  const originalWarn = console.warn;
  console.warn = () => {
    warned = true;
  };

  delete require.cache[require.resolve('./index.js')];
  require('./index.js');
  Module.prototype.require = originalRequire;

  const message = JSON.stringify({
    userid: 'user1',
    location: 'Sydney',
    current_temperature: 0
  });
  await handler(message);

  console.warn = originalWarn;
  assert.strictEqual(
    warned,
    false,
    'Zero temperature should not trigger missing field warning'
  );
}

async function run() {
  await testAwsNotification();
  await testFractionalThresholdRespected();
  await testZeroTemperatureAccepted();
  console.log('All tests passed');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
