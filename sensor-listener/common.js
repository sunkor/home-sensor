const Influx = require("influx");
const asyncRedis = require("async-redis");

const influxHost = process.env.INFLUX_HOST || "influxdb";
const influxPort = parseInt(process.env.INFLUX_PORT, 10) || 8086;
const influx = new Influx.InfluxDB({
  host: influxHost,
  port: influxPort,
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
const redisHost = process.env.REDIS_HOST || "redis";
const redisPort = parseInt(process.env.REDIS_PORT, 10) || 6379;
const asyncRedisClient = asyncRedis.createClient({
  host: redisHost,
  port: redisPort,
  retry_strategy: () => 1000
});

const redisPublisher = asyncRedisClient.duplicate();

exports.influx = influx;
exports.asyncRedisClient = asyncRedisClient;
exports.redisPublisher = redisPublisher;
