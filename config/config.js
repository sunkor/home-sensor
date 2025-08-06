const { config: loadEnv } = require('dotenv');
const { cleanEnv, str, num, bool } = require('envalid');

loadEnv();

const env = cleanEnv(process.env, {
  INFLUX_HOST: str({ default: 'influxdb' }),
  INFLUX_PORT: num({ default: 8086 }),
  REDIS_HOST: str({ default: 'redis' }),
  REDIS_PORT: num({ default: 6379 }),
  RATE_LIMIT_WINDOW_MS: num({ default: 60000 }),
  RATE_LIMIT_MAX_REQUESTS: num({ default: 60 }),
  MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION: num(),
  TEMPERATURE_THRESHOLD_IN_CELSIUS: num(),
  WEATHER_API_QUERY_POSTCODE: str({ default: undefined, optional: true }),
  WEATHER_API_QUERY_COUNTRY_CODE: str({ default: undefined, optional: true }),
  WEATHER_API_KEY: str({ default: undefined, optional: true }),
  WEATHER_API_ENDPOINT: str({ default: undefined, optional: true }),
  AWS_ACCESS_KEY: str({ default: undefined, optional: true }),
  AWS_SECRET_KEY: str({ default: undefined, optional: true }),
  AWS_REGION: str({ default: undefined, optional: true }),
  ENABLE_SMS_ALERTS: bool({ default: false, optional: true }),
  SMS_SENDER: str({ default: undefined, optional: true }),
  SMS_PHONE_NUMBER: str({ default: undefined, optional: true }),
  ENABLE_EMAIL_ALERTS: bool({ default: false, optional: true }),
  EMAIL_FROM: str({ default: undefined, optional: true }),
  EMAIL_FROM_ADDRESS: str({ default: undefined, optional: true }),
  EMAIL_LIST: str({ default: undefined, optional: true })
});

module.exports = env;
