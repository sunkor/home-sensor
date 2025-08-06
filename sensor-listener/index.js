const express = require("express");
const minDate = new Date("01 Nov 1970");
const timediff = require("timediff");
const { z } = require("zod");
const influx = require("./common").influx;
const asyncRedisClient = require("./common").asyncRedisClient;
const redisPublisher = require("./common").redisPublisher;
const waitForInfluxDb = require("../influxdb-ready").waitForInfluxDb;
const config = require("../config/config");

const {
  MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION,
  TEMPERATURE_THRESHOLD_IN_CELSIUS
} = config;

if (
  !Number.isFinite(MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION) ||
  !Number.isFinite(TEMPERATURE_THRESHOLD_IN_CELSIUS)
) {
  throw new Error(
    "Invalid numeric environment configuration for MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION or TEMPERATURE_THRESHOLD_IN_CELSIUS"
  );
}

const app = express();
app.use(express.json());

const payloadSchema = z.object({
  temperature: z.number(),
  location: z.string().min(1)
});

app.get("/", (req, res) => {
  res.send("hello world, now lets get serious shall well?");
});

// Simple health check endpoint for container orchestrators
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

function validatePayload(req, res, next) {
  const result = payloadSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).send("Invalid payload");
    return;
  }
  next();
}

async function writeToInflux(req, res, next) {
  try {
    await influx.writePoints([
      {
        measurement: "temperature_data_in_celsius",
        fields: {
          temperature: req.body.temperature
        },
        tags: { location: req.body.location }
      }
    ]);
    next();
  } catch (err) {
    next(err);
  }
}

async function sendNotification(req, res, next) {
  const userId = req.header("userid") || req.body.userid;
  if (typeof userId !== "string" || userId.trim() === "") {
    res.status(400).send("Missing or invalid user id.");
    return;
  }
  const temp = Number(req.body.temperature);
  if (!Number.isFinite(temp)) {
    res.status(400).send("Invalid temperature data.");
    return;
  }

  if (temp < TEMPERATURE_THRESHOLD_IN_CELSIUS) {
    res.send("posted temperature data.");
    return;
  }

  const messageToSend = JSON.stringify({
    userid: userId,
    location: req.body.location,
    current_temperature: temp
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(
      "temperature exceeded threshold! Publishing to redis, message - " +
        messageToSend
    );
  }

  let dt;
  try {
    const notification = await asyncRedisClient.get(userId);
    const parsedNotification = notification ? JSON.parse(notification) : null;
    dt = parsedNotification
      ? new Date(parsedNotification.last_notification_time)
      : minDate;
  } catch (err) {
    return next(err);
  }
  const diffInMinutes = timediff(dt, Date.now(), "m");

  if (
    Number.isFinite(diffInMinutes.minutes) &&
    diffInMinutes.minutes >= MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION
  ) {
    //Publish to notify sensor-alerts.
    try {
      await redisPublisher.publish("insert", messageToSend);
    } catch (err) {
      return next(err);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("temperature threshold exceeded message published to redis.");
    }
  } else if (process.env.NODE_ENV !== "production") {
    console.log(
      `Last notification was sent ${diffInMinutes.minutes} minutes ago. This is less than min time to wait (${MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION} minute(s)). Ignore sending notification.`
    );
  }

  res.send("posted temperature data.");
}

//POST
app.post("/temperature_data", validatePayload, writeToInflux, sendNotification);

//GOOGLE ACTION.
app.post("/fulfillment", require("./google-actions").fulfillment);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Error occurred while processing request.");
});

if (require.main === module) {
  (async () => {
    try {
      const names = await waitForInfluxDb(influx);
      if (!names.includes("home_sensors_db")) {
        await influx.createDatabase("home_sensors_db");
      }
      app.listen(8080, () => {
        console.log(`Listening on 8080.`);
      });
    } catch (error) {
      console.error("Failed to initialize InfluxDB", error);
    }
  })();
}

module.exports = { app, validatePayload, writeToInflux, sendNotification };
