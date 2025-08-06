# Sensor Listener

## Purpose
Provides a Node.js HTTP API that accepts temperature readings from sensors, stores them in InfluxDB and publishes alert messages to Redis when a threshold is exceeded.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set the required environment variables (see below).
3. Start the service:
   ```bash
   npm start
   ```

## Environment Variables
- **INFLUX_HOST** (default `influxdb`) – InfluxDB hostname.
- **INFLUX_PORT** (default `8086`) – InfluxDB port.
- **REDIS_HOST** (default `redis`) – Redis hostname.
- **REDIS_PORT** (default `6379`) – Redis port.
- **RATE_LIMIT_WINDOW_MS** (default `60000`) – time window for rate limiting in milliseconds.
- **RATE_LIMIT_MAX_REQUESTS** (default `60`) – maximum requests allowed per window.
- **MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION** – minutes to wait before sending another alert for the same user.
- **TEMPERATURE_THRESHOLD_IN_CELSIUS** – temperature that triggers an alert.

## Tests
Run the unit tests with:
```bash
npm test
```
