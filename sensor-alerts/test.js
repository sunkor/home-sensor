const assert = require('assert');
const Module = require('module');

async function testAwsNotification() {
  const originalRequire = Module.prototype.require;
  let sendMsgCalled = false;
  let redisSetCalled = false;

  process.env.AWS_ACCESS_KEY = 'key';
  process.env.AWS_SECRET_KEY = 'secret';
  process.env.AWS_REGION = 'us-east-1';
  process.env.SMS_SENDER = 'sender';
  process.env.SMS_PHONE_NUMBER = '1234567890';

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

async function testFractionalThresholdRespected() {
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
  process.env.TEMPERATURE_THRESHOLD_IN_CELSIUS = '25.5';
  delete require.cache[require.resolve('./index.js')];
  require('./index.js');
  Module.prototype.require = originalRequire;

  let message = JSON.stringify({
    userid: 'user1',
    location: 'Sydney',
    current_temperature: 25.4
  });
  await handler('insert', message);
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
  await handler('insert', message);
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
          on: (event, h) => {
            if (event === 'message') handler = h;
          },
          subscribe: () => {}
        },
        asyncRedisClient: { get: async () => null }
      };
    }
    if (request === './aws-notification') {
      return { sendNotification: () => {} };
    }
    return originalRequire.apply(this, arguments);
  };

  const originalWarn = console.warn;
  console.warn = () => {
    warned = true;
  };

  process.env.MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION = '0';
  process.env.TEMPERATURE_THRESHOLD_IN_CELSIUS = '0';
  delete require.cache[require.resolve('./index.js')];
  require('./index.js');
  Module.prototype.require = originalRequire;

  const message = JSON.stringify({
    userid: 'user1',
    location: 'Sydney',
    current_temperature: 0
  });
  await handler('insert', message);

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
