const assert = require('assert');

function testMissingEnvVarsThrows() {
  const required = [
    'WEATHER_API_QUERY_POSTCODE',
    'WEATHER_API_QUERY_COUNTRY_CODE',
    'WEATHER_API_KEY',
    'WEATHER_API_ENDPOINT'
  ];
  const backup = {};
  for (const key of required) {
    backup[key] = process.env[key];
    delete process.env[key];
  }
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
  for (const key of required) {
    if (backup[key] !== undefined) {
      process.env[key] = backup[key];
    }
  }
}

function run() {
  testMissingEnvVarsThrows();
  console.log('All tests passed');
}

run();
