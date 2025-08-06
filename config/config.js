const env = cleanEnv(process.env, {
  // InfluxDB host/port used by sensor-listener and weather-station.
  INFLUX_HOST: str({ default: 'influxdb' }),
  INFLUX_PORT: num({ default: 8086 }),

  // Redis connection for sensor-listener and sensor-alerts.
  REDIS_HOST: str({ default: 'redis' }),
  REDIS_PORT: num({ default: 6379 }),

  // Request-rate limiter settings for sensor-listener endpoints.
  RATE_LIMIT_WINDOW_MS: num({ default: 60000 }),   // window duration in ms
  RATE_LIMIT_MAX_REQUESTS: num({ default: 60 }),   // max requests per window

  // Alert throttling and temperature threshold shared by sensor-listener and sensor-alerts.
  MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION: num({ default: 60, optional: true }), // minutes before sending a repeat alert
  TEMPERATURE_THRESHOLD_IN_CELSIUS: num({ default: 30, optional: true }),             // temperature triggering an alert

  // Weather-station API query parameters.
  WEATHER_API_QUERY_POSTCODE: str({ default: undefined, optional: true }),      // ZIP/postcode
  WEATHER_API_QUERY_COUNTRY_CODE: str({ default: undefined, optional: true }), // ISO country code
  WEATHER_API_KEY: str({ default: undefined, optional: true }),                // weather-service API key
  WEATHER_API_ENDPOINT: str({ default: undefined, optional: true }),           // weather-service base URL

  // Twilio SMS alert configuration.
  TWILIO_ACCOUNT_SID: str({ default: undefined, optional: true }), // Twilio account SID
  TWILIO_AUTH_TOKEN: str({ default: undefined, optional: true }),  // Twilio auth token
  TWILIO_PHONE_NUMBER: str({ default: undefined, optional: true }),// sender phone number
  ENABLE_SMS_ALERTS: bool({ default: false, optional: true }),     // enable SMS delivery
  SMS_PHONE_NUMBER: str({ default: undefined, optional: true }),   // recipient number(s)

  // SendGrid e-mail alert configuration.
  SENDGRID_API_KEY: str({ default: undefined, optional: true }),  // SendGrid API key
  ENABLE_EMAIL_ALERTS: bool({ default: false, optional: true }),  // enable e-mail delivery
  EMAIL_FROM: str({ default: undefined, optional: true }),        // sender display name
  EMAIL_FROM_ADDRESS: str({ default: undefined, optional: true }),// sender e-mail address
  EMAIL_LIST: str({ default: undefined, optional: true })         // comma-separated recipients
});
