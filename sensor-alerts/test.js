const assert = require('assert');
const Module = require('module');

async function testAbortWhenRedisUnreachable() {
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function(request) {
    if (request === '../config/config') {
      return {
        REDIS_HOST: 'redis',
        REDIS_PORT: 6379,
        REDIS_CONNECT_RETRIES: 1,
        REDIS_CONNECT_RETRY_DELAY: 1
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
    return originalRequire.apply(this, arguments);
  };

  const originalExit = process.exit;
  let exitCode = null;
  process.exit = (code) => { exitCode = code; };

  delete require.cache[require.resolve('./connections.js')];
  require('./connections.js');
  await new Promise((resolve) => setImmediate(resolve));

  process.exit = originalExit;
  Module.prototype.require = originalRequire;

  assert.strictEqual(exitCode, 1, 'process should exit when Redis is unreachable');
}

async function testNotification() {
  const originalRequire = Module.prototype.require;
  let smsCalled = false;
  let emailCalled = false;
  let redisSetCalled = false;

  Module.prototype.require = function(request) {
    if (request === 'twilio') {
      return function() {
        return {
          messages: {
            create: async () => {
              smsCalled = true;
            }
          }
        };
      };
    }
    if (request === '@sendgrid/mail') {
      return {
        setApiKey: () => {},
        send: async () => {
          emailCalled = true;
        }
      };
    }
    if (request === './connections') {
      return { redisClient: { set: async () => { redisSetCalled = true; } } };
    }
    if (request === '../config/config') {
      return {
        TWILIO_ACCOUNT_SID: 'sid',
        TWILIO_AUTH_TOKEN: 'token',
        TWILIO_PHONE_NUMBER: '+1111111111',
        SMS_PHONE_NUMBER: '+2222222222',
        ENABLE_SMS_ALERTS: true,
        SENDGRID_API_KEY: 'SG.test',
        ENABLE_EMAIL_ALERTS: true,
        EMAIL_FROM: 'Home Sensor',
        EMAIL_FROM_ADDRESS: 'homesensor@example.com',
        EMAIL_LIST: 'user@example.com'
      };
    }
    return originalRequire.apply(this, arguments);
  };

  const notification = require('./notification');
  Module.prototype.require = originalRequire;

  await notification.sendNotification({
    userid: 'user1',
    location: 'Sydney',
    currentDt: Date.now(),
    message: 'Temperature alert'
  });

  assert(smsCalled, 'SMS should be sent');
  assert(emailCalled, 'Email should be sent');
  assert(redisSetCalled, 'redis set should be called');
}

async function testNotificationSmsDisabled() {
  const originalRequire = Module.prototype.require;
  let smsCalled = false;
  let emailCalled = false;
  let errorLogged = false;

  Module.prototype.require = function(request) {
    if (request === 'twilio') {
      return function() {
        return {
          messages: {
            create: async () => {
              smsCalled = true;
            }
          }
        };
      };
    }
    if (request === '@sendgrid/mail') {
      return {
        setApiKey: () => {},
        send: async () => {
          emailCalled = true;
        }
      };
    }
    if (request === './connections') {
      return { redisClient: { set: async () => {} } };
    }
    if (request === '../config/config') {
      return {
        TWILIO_ACCOUNT_SID: 'sid',
        TWILIO_AUTH_TOKEN: 'token',
        TWILIO_PHONE_NUMBER: '+1111111111',
        SMS_PHONE_NUMBER: '+2222222222',
        ENABLE_SMS_ALERTS: false,
        SENDGRID_API_KEY: 'SG.test',
        ENABLE_EMAIL_ALERTS: true,
        EMAIL_FROM: 'Home Sensor',
        EMAIL_FROM_ADDRESS: 'homesensor@example.com',
        EMAIL_LIST: 'user@example.com'
      };
    }
    return originalRequire.apply(this, arguments);
  };

  delete require.cache[require.resolve('@sendgrid/mail')];
  delete require.cache[require.resolve('twilio')];
  delete require.cache[require.resolve('../config/config')];
  delete require.cache[require.resolve('./notification')];
  const notification = require('./notification');
  Module.prototype.require = originalRequire;

  const originalError = console.error;
  console.error = () => {
    errorLogged = true;
  };

  await notification.sendNotification({
    userid: 'user1',
    location: 'Sydney',
    currentDt: Date.now(),
    message: 'Temperature alert'
  });

  console.error = originalError;

  assert.strictEqual(smsCalled, false, 'SMS should not be sent');
  assert(emailCalled, 'Email should be sent');
  assert.strictEqual(errorLogged, false, 'No error should be logged when SMS is disabled');
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
    if (request === './notification') {
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
    if (request === './notification') {
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
  await testAbortWhenRedisUnreachable();
  await testNotification();
  await testNotificationSmsDisabled();
  await testFractionalThresholdRespected();
  await testZeroTemperatureAccepted();
  console.log('All tests passed');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
