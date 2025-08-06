const Influx = require("influx");
const AsyncPolling = require("async-polling");
const fetch = require("node-fetch");
const moment = require("moment-timezone");
const waitForInfluxDb = require("../influxdb-ready").waitForInfluxDb;
let config;
try {
  config = require("../config/config");
} catch (error) {
  console.error("Missing or invalid environment variables:", error.message);
  process.exit(1);
}
const { parseWeatherData } = require("./parseWeather");

const latitude = config.WEATHER_API_LATITUDE;
const longitude = config.WEATHER_API_LONGITUDE;
const appid = config.WEATHER_API_KEY;
const apiEndpoint = config.WEATHER_API_ENDPOINT;

const baseUrl = apiEndpoint.endsWith("/")
  ? apiEndpoint.slice(0, -1)
  : apiEndpoint;
const url = `${baseUrl}/current.json?key=${encodeURIComponent(appid)}&q=${encodeURIComponent(
  latitude
)},${encodeURIComponent(longitude)}`;

if (process.env.NODE_ENV !== "production") {
  const redactedUrl = new URL(url);
  redactedUrl.searchParams.set("key", "***");
  console.log({
    apiEndpoint: apiEndpoint,
    latitude,
    longitude,
    invokeUrl: redactedUrl.toString()
  });
}

const influx = new Influx.InfluxDB({
  host: config.INFLUX_HOST,
  port: config.INFLUX_PORT,
  database: "home_sensors_db",
  schema: [
    {
      measurement: "temperature_data_in_celsius",
      fields: {
        temperature: Influx.FieldType.FLOAT
      },
      tags: ["location"]
    },
    {
      measurement: "humidity_data",
      fields: {
        humidity: Influx.FieldType.FLOAT
      },
      tags: ["location"]
    },
    {
      measurement: "daily_read",
      fields: {
        wind_speed: Influx.FieldType.FLOAT,
        wind_direction: Influx.FieldType.FLOAT,
        wind_direction_desc: Influx.FieldType.STRING,
        gust_speed: Influx.FieldType.FLOAT,
        sunrise: Influx.FieldType.INTEGER,
        sunset: Influx.FieldType.INTEGER,
        weather_main: Influx.FieldType.STRING,
        weather_description: Influx.FieldType.STRING,
        sunrise_time: Influx.FieldType.STRING,
        sunset_time: Influx.FieldType.STRING
      },
      tags: ["location"]
    }
  ]
});

const polling = AsyncPolling(async function(end) {
  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("fetching.." + url);
    } else {
      console.log("fetching.." + apiEndpoint);
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const json = await response.json();
    end(null, json);
  } catch (error) {
    console.error("Error fetching weather data", error);
    end(error, "error occured");
  }
}, 30000);

polling.on("error", function(error) {
  console.log(error);
});
polling.on("result", async function(json) {
  try {
    const summary_data = parseWeatherData(json);
    const aestTime = moment(new Date(summary_data.timestamp * 1000))
      .tz("Australia/Sydney")
      .format("DD-MM-YYYY HH:mm:ss");

    if (process.env.NODE_ENV !== "production") {
      console.log(`Local time - ${aestTime}`);
      console.log(summary_data);
    }

    try {
      await influx.writePoints([
        {
          measurement: "temperature_data_in_celsius",
          fields: {
            temperature: summary_data.currentTemp
          },
          tags: { location: summary_data.name }
        },
        {
          measurement: "temperature_data_in_celsius",
          fields: {
            temperature: summary_data.feels_like
          },
          tags: { location: `${summary_data.name}_feels_like` }
        },
        {
          measurement: "humidity_data",
          fields: {
            humidity: summary_data.humidity
          },
          tags: { location: summary_data.name }
        },
        {
          measurement: "daily_read",
          fields: {
            wind_speed: summary_data.wind_speed,
            wind_direction: summary_data.wind_direction,
            wind_direction_desc: summary_data.wind_direction_desc,
            gust_speed: summary_data.gust_speed,
            sunrise: summary_data.sunrise,
            sunset: summary_data.sunset,
            weather_main: summary_data.weather_main,
            weather_description: summary_data.weather_description,
            sunrise_time: summary_data.sunrise_time,
            sunset_time: summary_data.sunset_time
          },
          tags: { location: summary_data.name }
        }
      ]);
      console.log(summary_data);
    } catch (error) {
      console.error("Error writing points to InfluxDB", error);
    }
  } catch (error) {
    console.error("Failed to parse weather data", error);
  }
});

(async () => {
  try {
    const names = await waitForInfluxDb(influx);
    if (!names.includes("home_sensors_db")) {
      await influx.createDatabase("home_sensors_db");
    }
    console.log("influxdb ready. Begin polling...");
    polling.run(); // Let's start polling.
  } catch (error) {
    console.error("Failed to initialize InfluxDB", error);
  }
})();
