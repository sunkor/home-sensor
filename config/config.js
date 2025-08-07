const path = require('path');
const { config: loadEnv } = require('dotenv');
const { cleanEnv, str, num, bool } = require('envalid');

// Load .env file WITHOUT overriding already set environment variables
loadEnv({ path: path.resolve(__dirname, '../.env'), override: false });

const env = cleanEnv(process.env, {
  INFLUX_HOST: str({ default: 'influxdb' }),
  INFLUX_PORT: num({ default: 8086 }),

  REDIS_HOST: str({ default: 'redis' }),
  REDIS_PORT: num({ default: 6379 }),

  RATE_LIMIT_WINDOW_MS: num({ default: 60000 }),
  RATE_LIMIT_MAX_REQUESTS: num({ default: 60 }),

  MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION: num({ default: 60, optional: true }),
  TEMPERATURE_THRESHOLD_IN_CELSIUS: num({ default: 30, optional: true }),

  WEATHER_API_LATITUDE: num(),
  WEATHER_API_LONGITUDE: num(),
  WEATHER_API_KEY: str(),
  WEATHER_API_ENDPOINT: str({ default: 'https://api.weatherapi.com/v1', optional: true }),

  TWILIO_ACCOUNT_SID: str({ default: undefined, optional: true }),
  TWILIO_AUTH_TOKEN: str({ default: undefined, optional: true }),
  TWILIO_PHONE_NUMBER: str({ default: undefined, optional: true }),
  ENABLE_SMS_ALERTS: bool({ default: false, optional: true }),
  SMS_PHONE_NUMBER: str({ default: undefined, optional: true }),

  SENDGRID_API_KEY: str({ default: undefined, optional: true }),
  ENABLE_EMAIL_ALERTS: bool({ default: false, optional: true }),
  EMAIL_FROM: str({ default: undefined, optional: true }),
  EMAIL_FROM_ADDRESS: str({ default: undefined, optional: true }),
  EMAIL_LIST: str({ default: undefined, optional: true }),
});

module.exports = env;