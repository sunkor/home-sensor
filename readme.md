# Home Sensor

## Purpose
This project provides an end‑to‑end home sensor monitoring stack.  It accepts
temperature readings from custom hardware, enriches the data with weather
information, stores metrics in InfluxDB and visualises them in Grafana.  When
temperatures exceed a configured threshold the system can publish alerts by
SMS or e‑mail via AWS services.

## Architecture
The system is composed of multiple services orchestrated with
[docker‑compose](./docker-compose.yml):

- **sensor-listener** – Node.js HTTP API that receives temperature data and
  writes the readings to InfluxDB.  If the temperature crosses a defined
  threshold it publishes a message to Redis for alerting.
- **weather-station** – Polls a public weather API at regular intervals and
  stores the observations in InfluxDB alongside the local sensor data.
- **sensor-alerts** – Subscribes to Redis messages and sends notifications
  using AWS SNS (SMS) and SES (e‑mail).
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
- AWS account with permissions for SNS and SES
- API key for a weather provider such as OpenWeatherMap

### Environment variables
Sample `.env.example` files are available in the service directories. Copy one
to `.env` and adjust the values as needed, or provide the variables at runtime.

#### sensor-listener and sensor-alerts
- `INFLUX_HOST` – hostname for InfluxDB (default: `influxdb`).
- `INFLUX_PORT` – port for InfluxDB (default: `8086`).
- `REDIS_HOST` – hostname for Redis (default: `redis`).
- `REDIS_PORT` – port for Redis (default: `6379`).
- `MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION` – number of minutes to wait
  before sending another notification for the same user.
- `TEMPERATURE_THRESHOLD_IN_CELSIUS` – temperature that triggers an alert.
  > **Note**: previously this variable was named `TEMPERATURE_THRESHOLD_IN_CELCIUS`. Update any existing environment configurations to use the corrected spelling.

#### sensor-alerts (additional)
- `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `AWS_REGION`
- `ENABLE_SMS_ALERTS` – set to `true` to enable SMS via SNS.
- `SMS_SENDER` – name shown as SMS sender.
- `SMS_PHONE_NUMBER` – destination number with country code.
- `ENABLE_EMAIL_ALERTS` – set to `true` to enable email via SES.
- `EMAIL_FROM`, `EMAIL_FROM_ADDRESS` – sender details.
- `EMAIL_LIST` – comma separated list of recipients.

#### weather-station
- `INFLUX_HOST` – hostname for InfluxDB (default: `influxdb`).
- `INFLUX_PORT` – port for InfluxDB (default: `8086`).
- `WEATHER_API_KEY`
- `WEATHER_API_ENDPOINT` – e.g. `https://api.openweathermap.org/data/2.5/weather`
- `WEATHER_API_QUERY_POSTCODE`
- `WEATHER_API_QUERY_COUNTRY_CODE`

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

## Testing
The alert service contains a basic unit test.
```bash
cd sensor-alerts
npm test
```

## Related resources
- [InfluxDB documentation](https://docs.influxdata.com/influxdb/)
- [Grafana documentation](https://grafana.com/docs/)
- [AWS SNS](https://docs.aws.amazon.com/sns/latest/dg/welcome.html) and
  [AWS SES](https://docs.aws.amazon.com/ses/latest/dg/Welcome.html)
- [OpenWeatherMap API](https://openweathermap.org/api)
- [Docker documentation](https://docs.docker.com/)

