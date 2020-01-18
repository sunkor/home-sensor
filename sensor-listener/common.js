const Influx = require("influx");
const asyncRedis = require("async-redis");

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

//Redis setup.
const asyncRedisClient = asyncRedis.createClient({
  host: "redis",
  port: 6379,
  retry_strategy: () => 1000
});

const redisPublisher = asyncRedisClient.duplicate();

exports.influx = influx;
exports.asyncRedisClient = asyncRedisClient;
exports.redisPublisher = redisPublisher;
