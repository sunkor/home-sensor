const express = require("express");
const bodyParser = require("body-parser");
const Influx = require("influx");
const redis = require("redis");
const minDate = new Date("01 Nov 1970");
const timediff = require("timediff");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const MINUTES_TO_WAIT_BEFORE_SENDING_SMS =
  process.env.MINUTES_TO_WAIT_BEFORE_SENDING_SMS;
const TEMPERATURE_THRESHOLD_IN_CELCIUS =
  process.env.TEMPERATURE_THRESHOLD_IN_CELCIUS;

const app = express();
app.use(bodyParser.json());

const influx = new Influx.InfluxDB({
  host: "influxdb",
  database: "home_sensors_db",
  schema: [
    {
      measurement: "temperature_data_in_celcius",
      fields: {
        temperature: Influx.FieldType.FLOAT
      },
      tags: ["location"]
    }
  ]
});

//Redis setup.
const redisClient = redis.createClient({
  host: "redis",
  port: 6379,
  retry_strategy: () => 1000
});

const redisPublisher = redisClient.duplicate();

app.get("/", (req, res) => {
  res.send("hello world, now lets get serious shall well?");
});

app.post("/temperature_data", (req, res) => {
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

  if (parseInt(req.body.temperature) >= TEMPERATURE_THRESHOLD_IN_CELCIUS) {
    var locationid = "123";
    const messageToSend = JSON.stringify({
      locationid: locationid,
      location: req.body.location,
      current_temperature: req.body.temperature
    });
    console.log(
      "temperature exceeded threshold! Publishing to redis, message - " +
        messageToSend
    );
    redisClient.get(locationid, function(err, value) {
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
    });
  }

  res.send("Message received - " + JSON.stringify(req.body));
});

app.post("/webhook", (req, res) => {
  console.log('Received a POST request on /webhook');

  if(!req.body) return res.sendStatus(400);

  res.setHeader('Content-Type', 'application/json');
  console.log("Here is the request from Dialogflow, " + req.body);

  var location = req.body.queryResult.parameters['location'];
  console.log('location is , ' + location);

  const w = "weather is nothing."
  const response = "";
  const responseObj = {
    "fulfillmentText": response,
    "fulfillmentMessages": [{"text": {"text": [w]}}]
  };
  console.log('Response to Dialogflow, ' + JSON.stringify(responseObj));
  return res.send(JSON.stringify(responseObj));
})

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
