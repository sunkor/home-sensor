const express = require("express");
const bodyParser = require("body-parser");
const redis = require("redis");
const asyncRedis = require("async-redis");
const minDate = new Date("01 Nov 1970");
const timediff = require("timediff");
const influx = require("./common").influx;

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const MINUTES_TO_WAIT_BEFORE_SENDING_SMS =
  process.env.MINUTES_TO_WAIT_BEFORE_SENDING_SMS;
const TEMPERATURE_THRESHOLD_IN_CELCIUS =
  process.env.TEMPERATURE_THRESHOLD_IN_CELCIUS;

const app = express();
app.use(bodyParser.json());

//Redis setup.
const redisClient = redis.createClient({
  host: "redis",
  port: 6379,
  retry_strategy: () => 1000
});

const asyncRedisClient = asyncRedis.decorate(redisClient);
const redisPublisher = redisClient.duplicate();

app.get("/", (req, res) => {
  res.send("hello world, now lets get serious shall well?");
});

const locationid = "123";
    const locationid_threshold = locationid + "_threshold";

app.post('/temperature_threshold', async (req, res) => {
  console.log(JSON.stringify(req.body));
  if(req.body.temperature_threshold) {
    await asyncRedisClient.set(locationid_threshold, parseInt(req.body.temperature_threshold), redis.print);
    res.send(`Temperature threshold3 set successfully to ${req.body.temperature_threshold}`);
  } else {
    res.send('bad request').status(400);
  }
});

app.post("/temperature_data", async (req, res) => {
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
      console.log(req.body);
    });

    let temperatureThreshold = TEMPERATURE_THRESHOLD_IN_CELCIUS;
    console.log('fetch temperature threshold from redis...');

    const redisTempThresholdValue = await asyncRedisClient.get(locationid_threshold);
    console.log('threshold value, ' + redisTempThresholdValue);

    if(redisTempThresholdValue) {
      temperatureThreshold = parseInt(redisTempThresholdValue);
    }

console.log('Temperature threshold is: ' + temperatureThreshold);

  if (parseInt(req.body.temperature) >= temperatureThreshold) {
    
    const messageToSend = JSON.stringify({
      locationid: locationid,
      location: req.body.location,
      current_temperature: req.body.temperature
    });
    console.log(
      "temperature exceeded threshold! Publishing to redis, message - " +
        messageToSend
    );
    const value = await asyncRedisClient.get(locationid);
    const dt = !value ? minDate : new Date(JSON.parse(value).last_sms_time);
      const currentDt = Date.now();
      const diffInMinutes = timediff(dt, currentDt, "m");
      console.log({
        difflabel: "diff time min minutes",
        dt,
        currentDt,
        diffInMinutes
      });
      if (diffInMinutes.minutes >= MINUTES_TO_WAIT_BEFORE_SENDING_SMS) {
        redisPublisher.publish("insert", messageToSend);
        console.log(
          "temperature threshold exceeded message published to redis."
        );
      } else {
        console.log(
          `Last SMS was sent ${diffInMinutes.minutes} minutes ago. This is less than min time to wait (${MINUTES_TO_WAIT_BEFORE_SENDING_SMS} minute(s)). Ignore sending SMS.`
        );
      }
  }

  res.send("Message received - " + JSON.stringify(req.body));
});

app.post("/fulfillment", require("./google-actions").fulfillment);

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
