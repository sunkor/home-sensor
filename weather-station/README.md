# Weather Station

## Purpose
Periodically polls a public weather API and stores the observations in InfluxDB alongside local sensor data.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure the environment variables (see below).
3. Start the service:
   ```bash
   npm start
   ```

## Environment Variables
- **INFLUX_HOST** (default `influxdb`) – InfluxDB hostname.
- **INFLUX_PORT** (default `8086`) – InfluxDB port.
- **WEATHER_API_ENDPOINT** – base URL of the weather API.
- **WEATHER_API_KEY** – API key for the weather service.
- **WEATHER_API_QUERY_POSTCODE** – postcode for the location to query.
- **WEATHER_API_QUERY_COUNTRY_CODE** – country code for the location.

## Tests
Run the unit tests with:
```bash
npm test
```
