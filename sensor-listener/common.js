const Influx = require("influx");

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

exports.influx = influx;
