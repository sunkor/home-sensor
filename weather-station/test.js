const assert = require('assert');
const { parseWeatherData } = require('./parseWeather');

function testMissingEnvVarsThrows() {
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function(request) {
    if (request === '../config/config') {
      return {
        WEATHER_API_LATITUDE: undefined,
        WEATHER_API_LONGITUDE: undefined,
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

function testParseWeatherData() {
  const sample = {
    location: { name: 'Sydney', localtime_epoch: 1609459200 },
    current: {
      temp_c: 25,
      feelslike_c: 26,
      humidity: 60,
      wind_kph: 10,
      wind_degree: 90,
      wind_dir: 'E',
      gust_kph: 15,
      condition: { text: 'Sunny' }
    }
  };
  const result = parseWeatherData(sample);
  assert.strictEqual(result.name, 'Sydney');
  assert.strictEqual(result.currentTemp, 25);
  assert.strictEqual(result.wind_speed, 10);
  assert.strictEqual(result.wind_direction_desc, 'E');
  assert.strictEqual(result.weather_main, 'Sunny');
}

function run() {
  testMissingEnvVarsThrows();
  testParseWeatherData();
  console.log('All tests passed');
}

run();
