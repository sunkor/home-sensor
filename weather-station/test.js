const assert = require('assert');
const { parseWeatherData } = require('./parseWeather');

function testMissingEnvVarsThrows() {
  const originalEnv = {
    WEATHER_API_LATITUDE: process.env.WEATHER_API_LATITUDE,
    WEATHER_API_LONGITUDE: process.env.WEATHER_API_LONGITUDE,
    WEATHER_API_KEY: process.env.WEATHER_API_KEY
  };
  delete process.env.WEATHER_API_LATITUDE;
  delete process.env.WEATHER_API_LONGITUDE;
  delete process.env.WEATHER_API_KEY;

  const originalExit = process.exit;
  let exitCode;
  process.exit = code => {
    exitCode = code;
    throw new Error('exit');
  };

  const originalError = console.error;
  let logged = '';
  console.error = (...args) => {
    logged += args.join(' ');
  };

  delete require.cache[require.resolve('./index.js')];
  delete require.cache[require.resolve('../config/config')];

  try {
    require('./index.js');
    assert.fail('Expected process.exit to be called');
  } catch (err) {
    assert.strictEqual(err.message, 'exit');
    assert.strictEqual(exitCode, 1);
    assert(
      logged.includes('Missing or invalid environment variables'),
      'Should log missing env vars'
    );
  } finally {
    process.exit = originalExit;
    console.error = originalError;
    Object.assign(process.env, originalEnv);
  }
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
