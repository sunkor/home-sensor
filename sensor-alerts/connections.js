const { createClient } = require("redis");
const config = require("./config/config");

async function connectWithRetry(
  client,
  retries = config.REDIS_CONNECT_RETRIES || 5,
  delay = config.REDIS_CONNECT_RETRY_DELAY || 1000
) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await client.connect();
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.error(
        `Redis connection attempt ${attempt} failed. Retrying in ${delay}ms...`,
        err
      );
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
    }
  }
}

function setupListeners(client, name) {
  if (typeof client.on !== "function") return;

  client.on("error", err => {
    console.error(`Redis ${name} error`, err);
    if (!client.isOpen) {
      connectWithRetry(client).catch(e =>
        console.error(`Redis ${name} reconnection error`, e)
      );
    }
  });

  client.on("end", () => {
    console.error(
      `Redis ${name} connection closed. Attempting to reconnect...`
    );
    connectWithRetry(client).catch(e =>
      console.error(`Redis ${name} reconnection error`, e)
    );
  });
}

const redisClient = createClient({
  url: `redis://${config.REDIS_HOST}:${config.REDIS_PORT}`
});
const redisSubscriber = redisClient.duplicate();

setupListeners(redisClient, "client");
setupListeners(redisSubscriber, "subscriber");

(async () => {
  try {
    await connectWithRetry(redisClient);
    await connectWithRetry(redisSubscriber);
  } catch (err) {
    console.error("Redis connection error", err);
    // Exit to avoid running without a required Redis connection.
    process.exit(1);
  }
})();

module.exports.redisClient = redisClient;
module.exports.redisSubscriber = redisSubscriber;
