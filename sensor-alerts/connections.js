const asyncRedis = require("async-redis");

const redisHost = process.env.REDIS_HOST || "redis";
const redisPort = parseInt(process.env.REDIS_PORT, 10) || 6379;
const asyncRedisClient = asyncRedis.createClient({
  host: redisHost,
  port: redisPort,
  retry_strategy: () => 1000
});

const subscriber = asyncRedisClient.duplicate();

module.exports.redisSubscriber = subscriber;
module.exports.asyncRedisClient = asyncRedisClient;
