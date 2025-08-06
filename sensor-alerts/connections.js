const { createClient } = require("redis");

const redisHost = process.env.REDIS_HOST || "redis";
const redisPortEnv = parseInt(process.env.REDIS_PORT, 10);
const redisPort = Number.isFinite(redisPortEnv) ? redisPortEnv : 6379;
const redisClient = createClient({ url: `redis://${redisHost}:${redisPort}` });

redisClient.on("error", err => {
  console.error("Redis Client Error", err);
});

const subscriber = redisClient.duplicate();

(async () => {
  await redisClient.connect();
  await subscriber.connect();
})();

module.exports.redisSubscriber = subscriber;
module.exports.redisClient = redisClient;
