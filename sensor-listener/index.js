const express = require("express");
const bodyParser = require("body-parser");
const minDate = new Date("01 Nov 1970");
const timediff = require("timediff");
const influx = require("./common").influx;
const asyncRedisClient = require("./common").asyncRedisClient;
const redisPublisher = require("./common").redisPublisher;
const userid = "123";

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION = parseInt(
  process.env.MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION,
  10
);
const TEMPERATURE_THRESHOLD_IN_CELSIUS = parseInt(
  process.env.TEMPERATURE_THRESHOLD_IN_CELSIUS,
  10
);

if (
  !Number.isFinite(MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION) ||
  !Number.isFinite(TEMPERATURE_THRESHOLD_IN_CELSIUS)
) {
  throw new Error(
    "Invalid numeric environment configuration for MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION or TEMPERATURE_THRESHOLD_IN_CELSIUS"
  );
}

const app = express();
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("hello world, now lets get serious shall well?");
});

function validatePayload(req, res, next) {
  const { temperature, location } = req.body;
  if (
    typeof temperature !== "number" ||
    !Number.isFinite(temperature) ||
    typeof location !== "string" ||
    location.trim() === ""
  ) {
    res.status(400).send("Invalid payload");
    return;
  }
  next();
}

function writeToInflux(req, res, next) {
  influx
    .writePoints([
      {
        measurement: "temperature_data_in_celsius",
        fields: {
          temperature: req.body.temperature
        },
        tags: { location: req.body.location }
      }
    ])
    .then(() => {
      next();
    })
    .catch(err => {
      console.error(err);
      res.status(500).send("Error occurred while writing to InfluxDb!");
    });
}

async function sendNotification(req, res) {
  const temp = parseInt(req.body.temperature, 10);
  if (!Number.isFinite(temp)) {
    res.status(400).send("Invalid temperature data.");
    return;
  }

  if (temp < TEMPERATURE_THRESHOLD_IN_CELSIUS) {
    res.send("posted temperature data.");
    return;
  }

  const messageToSend = JSON.stringify({
    userid: userid,
    location: req.body.location,
    current_temperature: temp
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(
      "temperature exceeded threshold! Publishing to redis, message - " +
        messageToSend
    );
  }

  const notification = await asyncRedisClient.get(userid);
  const dt = !notification
    ? minDate
    : new Date(JSON.parse(notification).last_notification_time);
  const diffInMinutes = timediff(dt, Date.now(), "m");

  if (
    Number.isFinite(diffInMinutes.minutes) &&
    diffInMinutes.minutes >= MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION
  ) {
    //Publish to notify sensor-alerts.
    redisPublisher.publish("insert", messageToSend);

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

//Start after 10 seconds. We want InfluxDb to be ready.
setTimeout(function() {
  influx
    .getDatabaseNames()
    .then(names => {
      if (!names.includes("home_sensors_db")) {
        return influx.createDatabase("home_sensors_db");
      }
    })
    .then(() => {
      app.listen(8080, () => {
        console.log(`Listening on 8080.`);
      });
    })
    .catch(error => console.log({ error }));
}, 10000);
