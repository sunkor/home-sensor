const asyncRedis = require("async-redis");

const asyncRedisClient = asyncRedis.createClient({
  host: "redis",
  port: 6379,
  retry_strategy: () => 1000
});

const subscriber = asyncRedisClient.duplicate();

module.exports.redisSubscriber = subscriber;
module.exports.asyncRedisClient = asyncRedisClient;
