const Influx = require("influx");
const asyncRedis = require("async-redis");

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
const asyncRedisClient = asyncRedis.createClient({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  retry_strategy: () => 1000
});

const redisPublisher = asyncRedisClient.duplicate();

exports.influx = influx;
exports.asyncRedisClient = asyncRedisClient;
exports.redisPublisher = redisPublisher;
