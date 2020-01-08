const sendMsg = require("aws-sns-sms");
const awsSesMail = require("aws-ses-mail");
const redis = require("redis");
const timediff = require("timediff");
const minDate = new Date("01 Nov 1970");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const MINUTES_TO_WAIT_BEFORE_SENDING_SMS =
  process.env.MINUTES_TO_WAIT_BEFORE_SENDING_SMS;
const TEMPERATURE_THRESHOLD_IN_CELCIUS =
  process.env.TEMPERATURE_THRESHOLD_IN_CELCIUS;

const redisClient = redis.createClient({
  host: "redis",
  port: 6379,
  retry_strategy: () => 1000
});

const subscriber = redisClient.duplicate();

const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION
};

subscriber.on("message", (channel, message) => {
  console.log("message received, " + message);

  const temperatureData = JSON.parse(message);
  const { locationid, location, current_temperature } = { ...temperatureData };

  //Check required fields.
  if (!locationid || !location || !current_temperature) {
    console.log(
      "Missing required fields {location id, or location, or current_temperature} from message"
    );
    return;
  }

  //Check threshold.
  if (parseInt(current_temperature) < TEMPERATURE_THRESHOLD_IN_CELCIUS) {
    console.log(
      `Current temperature read, ${current_temperature} does not exceed the threshold ${TEMPERATURE_THRESHOLD_IN_CELCIUS}`
    );
    return;
  }

  //Get last sms sent time.
  redisClient.get(locationid, function(err, value) {
    if (err) {
      console.log(
        `An error occured while attempting to fetch value from location, ${locationid}, ${err}`
      );
      return;
    }

    console.log("fetching value, - " + value);

    if (value) {
      console.log("value fetched, " + value);
      console.log("time : ", new Date(JSON.parse(value).last_sms_time));
    }

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
      console.log("time threshold exceeded, sending the e-mail.");

      const msg = {
        message: `Alert! Temperature threshold of ${TEMPERATURE_THRESHOLD_IN_CELCIUS} has exceeded! Current temperature in ${location} is ${current_temperature}`,
        sender: process.env.SMS_SENDER,
        phoneNumber: process.env.SMS_PHONE_NUMBER // phoneNumber along with country code
      };

      console.log("message to send - " + msg.message);

      //Send SMS via AWS SNS.
      sendMsg(awsConfig, msg)
        .then(data => {
          console.log("Message sent at: " + currentDt);
          redisClient.set(
            locationid,
            JSON.stringify({
              last_sms_time: currentDt
            }),
            redis.print
          );
        })
        .catch(err => {
          console.log("Error occured - " + err);
        });

      //Send e-mail via AWS SES.
      sendEmail();
    } else {
      console.log("time threshold has not exceeded. Ignore!");
    }
  });
});

sendEmail = () => {
  //send e-mail.
  var sesMail = new awsSesMail();
  sesMail.setConfig(awsConfig);

  const TEMPERATURE_THRESHOLD_IN_CELCIUS = 30;
  const location = "study_room2";
  const current_temperature = 33.33;

  const emailToSend = {
    from: `${process.env.EMAIL_FROM} <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: process.env.EMAIL_LIST,
    subject: `Alert! Temperature in ${location} has exceeded threshold`,
    content: `<html><head></head><body><div><p>Alert! Temperature threshold of ${TEMPERATURE_THRESHOLD_IN_CELCIUS} has exceeded! Current temperature in ${location} is ${current_temperature}</p></div></body></html>`
  };

  console.log(emailToSend);

  sesMail.sendEmail(emailToSend, function(data) {
    console.log(
      "successfully sent e-mail. details - " + JSON.stringify(emailToSend)
    );
  });
  //send e-mail.
  return;
};

subscriber.subscribe("insert");
