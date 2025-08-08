# Home Sensor

## Purpose
This project provides an end‑to‑end home sensor monitoring stack.  It accepts
temperature readings from custom hardware, enriches the data with weather
information, stores metrics in InfluxDB and visualises them in Grafana.  When
temperatures exceed a configured threshold the system can publish alerts by
SMS via Twilio or e‑mail via SendGrid.

## Architecture
The system is composed of multiple services orchestrated with
[docker‑compose](./docker-compose.yml):

- **sensor-listener** – Node.js HTTP API that receives temperature data and
  writes the readings to InfluxDB.  It enforces configurable request rate
  limits and, if the temperature crosses a defined threshold, publishes a
  message to Redis for alerting.
- **weather-station** – Polls a public weather API at regular intervals and
  stores the observations in InfluxDB alongside the local sensor data.
- **sensor-alerts** – Subscribes to Redis messages and sends notifications
  using Twilio (SMS) and SendGrid (e‑mail).
- **influxdb** – Time‑series database used for persisting sensor and weather
  measurements.
- **redis** – Message broker used for passing alert messages between services.
- **grafana** – Web UI for building dashboards on top of the data stored in
  InfluxDB.
- **nginx** – Reverse proxy that exposes the services and Grafana.
- **health-checks** – Telegraf container collecting host and container metrics.

## Setup
### Prerequisites
- Docker and Docker Compose
- Node.js 18 (to run services locally without Docker)
- Twilio account credentials (Account SID, Auth Token, and a sending number)
- SendGrid API key and sender details
- API key for a weather provider such as WeatherAPI

### Environment variables
Sample `.env.example` files are available in the service directories. Copy one
to `.env` and adjust the values as needed, or provide the variables at runtime.

#### sensor-listener
- `INFLUX_HOST` – hostname for InfluxDB (default: `influxdb`).
- `INFLUX_PORT` – port for InfluxDB (default: `8086`).
- `REDIS_HOST` – hostname for Redis (default: `redis`).
- `REDIS_PORT` – port for Redis (default: `6379`).
- `MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION` – number of minutes to wait
  before sending another notification for the same user.
- `TEMPERATURE_THRESHOLD_IN_CELSIUS` – temperature that triggers an alert.
- `RATE_LIMIT_WINDOW_MS` – time window in milliseconds for rate limiting (default: `60000`).
- `RATE_LIMIT_MAX_REQUESTS` – max requests allowed per window for a user or IP (default: `60`).
> **Note**: previously this variable was named `TEMPERATURE_THRESHOLD_IN_CELCIUS`. Update any existing environment configurations to use the corrected spelling.

#### sensor-alerts
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `SMS_PHONE_NUMBER` – destination number with country code.
- `SENDGRID_API_KEY`
- `EMAIL_FROM`, `EMAIL_FROM_ADDRESS` – sender details.
- `EMAIL_LIST` – comma separated list of recipients.
- `ENABLE_SMS_ALERTS` – set to `true` to enable SMS via Twilio.
- `ENABLE_EMAIL_ALERTS` – toggle email via SendGrid (default `true`).

#### weather-station
- `INFLUX_HOST` – hostname for InfluxDB (default: `influxdb`).
- `INFLUX_PORT` – port for InfluxDB (default: `8086`).
- `WEATHER_API_KEY`
- `WEATHER_API_ENDPOINT` – e.g. `https://api.weatherapi.com/v1/current.json`
- `WEATHER_API_LATITUDE`
- `WEATHER_API_LONGITUDE`

### Running
#### Using Docker Compose
```bash
docker-compose up -d
```
This starts all services.  Use `docker-compose down` to stop them and
`docker-compose build` to rebuild images.

#### Running a component locally
Each Node.js service can also be run directly:
```bash
cd sensor-listener
npm install
npm start
```
Repeat for `sensor-alerts` and `weather-station` with the appropriate
environment variables.

### GitHub Actions deployment
Secrets such as `WEATHER_API_KEY`, `WEATHER_API_LATITUDE`, `WEATHER_API_LONGITUDE`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_PHONE_NUMBER`, and `SENDGRID_API_KEY` are stored in the repository's
**Settings → Secrets and variables → Actions**. The deployment workflow reads
these values and exposes them to `docker compose up` so they are available to
the running services.

## Testing
The `sensor-listener`, `weather-station` and `sensor-alerts` services each
contain a basic unit test.

```bash
cd sensor-listener
npm test

cd weather-station
npm test

cd sensor-alerts
npm test
```

## Related resources
- [InfluxDB documentation](https://docs.influxdata.com/influxdb/)
- [Grafana documentation](https://grafana.com/docs/)
- [Twilio SMS API](https://www.twilio.com/docs/sms) and
  [SendGrid Email API](https://docs.sendgrid.com/)
- [WeatherAPI documentation](https://www.weatherapi.com/docs/)
- [Docker documentation](https://docs.docker.com/)

