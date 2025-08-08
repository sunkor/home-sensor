# Sensor Alerts

## Purpose
Listens for alert messages on Redis and sends notifications via SMS or e-mail when temperature thresholds are exceeded.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure the environment variables (see below). When running outside Docker, set `REDIS_HOST` to `localhost`; use `redis` only when running inside a Docker network.
3. Start the service:
   ```bash
   npm start
   ```

## Environment Variables
- **REDIS_HOST** (default `localhost`) – Redis hostname. Use `redis` when running inside a Docker network.
- **REDIS_PORT** (default `6379`) – Redis port.
- **MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION** – minutes to wait before sending another alert for the same user.
- **TEMPERATURE_THRESHOLD_IN_CELSIUS** – temperature that triggers an alert.
- **ENABLE_SMS_ALERTS** (default `false`) – enable SMS notifications.
  - **TWILIO_ACCOUNT_SID**, **TWILIO_AUTH_TOKEN**, **TWILIO_PHONE_NUMBER**, **SMS_PHONE_NUMBER** – required when SMS alerts are enabled.
- **ENABLE_EMAIL_ALERTS** (default `false`) – enable e-mail notifications.
  - **SENDGRID_API_KEY**, **EMAIL_FROM**, **EMAIL_FROM_ADDRESS**, **EMAIL_LIST** – required when e-mail alerts are enabled.

## Error Handling
The service requires Redis at startup. If a connection cannot be established, it logs the error and exits without retrying so that an external supervisor can restart it.

## Tests
Run the unit tests with:
```bash
npm test
```
