const Influx = require("influx");
const { createClient } = require("redis");

const config = require("../config/config");
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
    }
  ]
});

//Redis setup.
const redisClient = createClient({
  url: `redis://${config.REDIS_HOST}:${config.REDIS_PORT}`
});
const redisPublisher = redisClient.duplicate();

(async () => {
  try {
    await redisClient.connect();
    await redisPublisher.connect();
  } catch (err) {
    console.error("Redis connection error", err);
  }
})();

exports.influx = influx;
exports.redisClient = redisClient;
exports.redisPublisher = redisPublisher;
