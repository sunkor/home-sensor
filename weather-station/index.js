const Influx = require("influx");
const AsyncPolling = require("async-polling");
const fetch = require("node-fetch");
const d2d = require("degrees-to-direction");
const convert = require("convert-units");
const moment = require("moment-timezone");
const waitForInfluxDb = require("../influxdb-ready").waitForInfluxDb;
const config = require("../config/config");

const zipCode = config.WEATHER_API_QUERY_POSTCODE;
const countryCode = config.WEATHER_API_QUERY_COUNTRY_CODE;
const appid = config.WEATHER_API_KEY;
const apiEndpoint = config.WEATHER_API_ENDPOINT;

if (!zipCode || !countryCode || !appid || !apiEndpoint) {
  const missingVars = [
    !zipCode && "WEATHER_API_QUERY_POSTCODE",
    !countryCode && "WEATHER_API_QUERY_COUNTRY_CODE",
    !appid && "WEATHER_API_KEY",
    !apiEndpoint && "WEATHER_API_ENDPOINT"
  ]
    .filter(Boolean)
    .join(", ");
  throw new Error(`Missing required environment variables: ${missingVars}`);
}

const units = "metric";
const url = `${apiEndpoint}?zip=${encodeURIComponent(zipCode)},${encodeURIComponent(
  countryCode
)}&units=${encodeURIComponent(units)}&appid=${encodeURIComponent(appid)}`;

if (process.env.NODE_ENV !== "production") {
  const redactedUrl = new URL(url);
  redactedUrl.searchParams.set("appid", "***");
  console.log({
    apiEndpoint: apiEndpoint,
    postCode: zipCode,
    countryCode: countryCode,
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

const polling = AsyncPolling(function(end) {
  if (process.env.NODE_ENV !== "production") {
    console.log("fetching.." + url);
  } else {
    console.log("fetching.." + apiEndpoint);
  }
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(json => end(null, json))
    .catch(error => {
      console.error("Error fetching weather data", error);
      end(error, "error occured");
    });
}, 30000);

polling.on("error", function(error) {
  console.log(error);
});
polling.on("result", function(json) {
  if (json.cod === 200) {
    const timestamp = json.dt;
    const aestTime = moment(new Date(timestamp * 1000))
      .tz("Australia/Sydney")
      .format("DD-MM-YYYY HH:mm:ss");

    if (process.env.NODE_ENV !== "production") {
      console.log(`Local time - ${aestTime}`);
    }

    const sunriseDateInAest = moment(new Date(json.sys.sunrise * 1000))
      .tz("Australia/Sydney")
      .format("DD-MM-YYYY HH:mm:ss");
    console.log(`Sunrise date - ${sunriseDateInAest}`);

    const sunsetDateInAest = moment(new Date(json.sys.sunset * 1000))
      .tz("Australia/Sydney")
      .format("DD-MM-YYYY HH:mm:ss");
    console.log(`Sunset date - ${sunsetDateInAest}`);

    const wind = json.wind || {};

    if (!json.weather || !Array.isArray(json.weather) || json.weather.length === 0) {
      console.error("Missing weather data in API response");
      return;
    }

    const summary_data = {
      name: json.name,
      currentTemp: json.main.temp,
      feels_like: json.main.feels_like,
      temp_min: json.main.temp_min,
      temp_max: json.main.temp_max,
      humidity: json.main.humidity,
      wind_speed: convert(isNaN(wind.speed) ? 0 : wind.speed)
        .from("m/s")
        .to("km/h"),
      wind_direction: isNaN(wind.deg) ? 0 : wind.deg,
      wind_direction_desc: isNaN(wind.deg) ? "n/a" : d2d(wind.deg),
      gust_speed: convert(isNaN(wind.gust) ? 0 : wind.gust)
        .from("m/s")
        .to("km/h"),
      sunrise: json.sys.sunrise,
      sunset: json.sys.sunset,
      weather_main: json.weather[0].main,
      weather_description: json.weather[0].description,
      sunrise_time: sunriseDateInAest,
      sunset_time: sunsetDateInAest
    };

    if (process.env.NODE_ENV !== "production") {
      console.log(summary_data);
    }

    influx
      .writePoints([
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
      ])
      .then(() => {
        console.log(summary_data);
      })
      .catch(error => {
        console.error("Error writing points to InfluxDB", error);
      });
  } else {
    console.error("Failed to fetch data", json);
  }
});

waitForInfluxDb(influx)
  .then(names => {
    if (!names.includes("home_sensors_db")) {
      return influx.createDatabase("home_sensors_db");
    }
  })
  .then(() => {
    console.log("influxdb ready. Begin polling...");
    polling.run(); // Let's start polling.
  })
  .catch(error => {
    console.error("Failed to initialize InfluxDB", error);
  });
