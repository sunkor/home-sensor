const assert = require('assert');

function testMissingEnvVarsThrows() {
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function(request) {
    if (request === '../config/config') {
      return {
        WEATHER_API_QUERY_POSTCODE: undefined,
        WEATHER_API_QUERY_COUNTRY_CODE: undefined,
        WEATHER_API_KEY: undefined,
        WEATHER_API_ENDPOINT: undefined,
        INFLUX_HOST: 'influxdb',
        INFLUX_PORT: 8086
      };
    }
    return originalRequire.apply(this, arguments);
  };
  delete require.cache[require.resolve('./index.js')];
  try {
    require('./index.js');
    assert.fail('Expected an error when env vars are missing');
  } catch (err) {
    assert(
      err.message.includes('Missing required environment variables'),
      'Should complain about missing environment variables'
    );
  }
  Module.prototype.require = originalRequire;
}

function run() {
  testMissingEnvVarsThrows();
  console.log('All tests passed');
}

run();
