const express = require("express");
const bodyParser = require("body-parser");
const Influx = require("influx");

const app = express();
app.use(bodyParser.json());

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
    }
  ]
});

app.get("/", (req, res) => {
  res.send("hello world, now lets get serious shall well?");
});

app.post("/temperature_data", (req, res) => {
  influx
    .writePoints([
      {
        measurement: "temperature_data_in_celcius",
        fields: {
          temperature: req.body.temperature
        },
        tags: { location: req.body.location }
      }
    ])
    .then(() => {
      console.log(req.body);
    });
  res.send("Message received - " + JSON.stringify(req.body));
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
      app.listen(8080, () => {
        console.log(`Listening on 8080.`);
      });
    })
    .catch(error => console.log({ error }));
}, 5000);
