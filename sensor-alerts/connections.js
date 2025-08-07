const { createClient } = require("redis");
const config = require("../config/config");

const redisClient = createClient({
  url: `redis://${config.REDIS_HOST}:${config.REDIS_PORT}`
});
const redisSubscriber = redisClient.duplicate();

(async () => {
  try {
    await redisClient.connect();
    await redisSubscriber.connect();
  } catch (err) {
    console.error("Redis connection error", err);
    // Exit to avoid running without a required Redis connection.
    process.exit(1);
  }
})();

module.exports.redisClient = redisClient;
module.exports.redisSubscriber = redisSubscriber;
