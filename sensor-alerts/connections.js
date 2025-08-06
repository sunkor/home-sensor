const asyncRedis = require("async-redis");
const config = require("../config/config");
const asyncRedisClient = asyncRedis.createClient({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  retry_strategy: () => 1000
});

const subscriber = asyncRedisClient.duplicate();

module.exports.redisSubscriber = subscriber;
module.exports.asyncRedisClient = asyncRedisClient;
