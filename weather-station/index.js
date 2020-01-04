const Influx = require("influx");
const AsyncPolling = require("async-polling");
const fetch = require("node-fetch");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const zipCode = process.env.WEATHER_API_QUERY_POSTCODE;
const countryCode = process.env.WEATHER_API_QUERY_COUNTRY_CODE;
const units = "metric";
const appid = process.env.WEATHER_API_KEY;
const apiEndpoint = process.env.WEATHER_API_ENDPOINT;
const url = `${apiEndpoint}?zip=${zipCode},${countryCode}&units=${units}&appid=${appid}`;

if (process.env.NODE_ENV !== "production") {
  console.log({
    apiEndpoint: apiEndpoint,
    apiKey: appid,
    postCode: zipCode,
    countryCode: countryCode,
    invokeUrl: url
  });
}

const influx = new Influx.InfluxDB({
  host: "influxdb",
  database: "home_sensors_db",
  schema: [
    {
      measurement: "temperature_data_in_celcius",
      fields: {
        temperature: Influx.FieldType.FLOAT
      },
      tags: ["location"]
    },
    {
      measurement: "humidity_data_in_celcius",
      fields: {
        humidity: Influx.FieldType.FLOAT
      },
      tags: ["location"]
    }
  ]
});

var polling = AsyncPolling(function(end) {
  console.log("fetching.." + url);
  fetch(url)
    .then(response => response.json())
    .then(json => end(null, json))
    .catch(message => {
      end(message, "error occured");
    });
}, 5000);

polling.on("error", function(error) {
  console.log(error);
});
polling.on("result", function(json) {
  if (json.cod === 200) {
    var timestamp = json.dt;
    var utcDate = new Date(timestamp * 1000);
    var localDate = new Date(utcDate);
    console.log(`Utc - ${utcDate}`);
    console.log(`Local time - ${localDate}`);
    console.log(
      `${json.name} weather, 
      current temp ${json.main.temp}, 
      feels like ${json.main.feels_like}, 
      temp_min ${json.main.temp_min}, 
      temp_max ${json.main.temp_max}, 
      hummidity ${json.main.humidity}%`
    );
    influx
      .writePoints([
        {
          measurement: "temperature_data_in_celcius",
          fields: {
            temperature: json.main.temp
          },
          tags: { location: json.name }
        },
        {
          measurement: "temperature_data_in_celcius",
          fields: {
            temperature: json.main.feels_like
          },
          tags: { location: `${json.name}_${json.main.feels_like}` }
        },
        {
          measurement: "humidity_data_in_celcius",
          fields: {
            humidity: json.main.humidity
          },
          tags: { location: json.name }
        }
      ])
      .then(() => {
        console.log(
          `location ${json.name}, current temp ${json.main.temp}, humidity ${json.main.humidity}`
        );
      });
  } else {
    console.log("did not fetch data");
  }
});

setTimeout(function() {
  influx
    .getDatabaseNames()
    .then(names => {
      if (!names.includes("home_sensors_db")) {
        return influx.createDatabase("home_sensors_db");
      }
    })
    .then(() => {
      console.log("influxdb ready. Begin polling...");
      polling.run(); // Let's start polling.
    })
    .catch(error => console.log({ error }));
}, 10000);
