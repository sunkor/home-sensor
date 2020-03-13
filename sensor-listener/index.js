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

const MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION =
  process.env.MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION;
const TEMPERATURE_THRESHOLD_IN_CELCIUS =
  process.env.TEMPERATURE_THRESHOLD_IN_CELCIUS;

const app = express();
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("hello world, now lets get serious shall well?");
});

function writeToInflux(req, res, next) {
  influx
    .writePoints([
      {
        measurement: "temperature_data_in_celcius",
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
      res.send("Error occured while writing to InfluxDb!").status(500);
    });
}

async function sendNotification(req, res) {
  if (parseInt(req.body.temperature) < TEMPERATURE_THRESHOLD_IN_CELCIUS) {
    res.send("posted temperature data.");
    return;
  }

  const messageToSend = JSON.stringify({
    userid: userid,
    location: req.body.location,
    current_temperature: req.body.temperature
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

  if (diffInMinutes.minutes >= MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION) {
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
app.post("/temperature_data", writeToInflux, sendNotification);

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
