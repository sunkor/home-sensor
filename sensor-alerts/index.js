const timediff = require("timediff");
const awsNotification = require("./aws-notification");
const minDate = new Date("01 Nov 1970");
const connections = require("./connections");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION = parseInt(
  process.env.MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION,
  10
);
const TEMPERATURE_THRESHOLD_IN_CELCIUS = parseInt(
  process.env.TEMPERATURE_THRESHOLD_IN_CELCIUS,
  10
);

if (
  !Number.isFinite(MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION) ||
  !Number.isFinite(TEMPERATURE_THRESHOLD_IN_CELCIUS)
) {
  throw new Error(
    "Invalid numeric environment configuration for MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION or TEMPERATURE_THRESHOLD_IN_CELCIUS"
  );
}

connections.redisSubscriber.on("message", async (channel, message) => {
  if (process.env.NODE_ENV !== "production") {
    console.log("message received, " + message);
  }

  const { userid, location, current_temperature } = JSON.parse(message);

  //Check required fields.
  if (!userid || !location || !current_temperature) {
    console.warn(
      "Missing required fields {userid, or location, or current_temperature} from message."
    );
    return;
  }

  const currentTemp = parseInt(current_temperature, 10);
  if (!Number.isFinite(currentTemp)) {
    console.warn(
      `Invalid current_temperature received: ${current_temperature}`
    );
    return;
  }

  //Check threshold.
  if (currentTemp < TEMPERATURE_THRESHOLD_IN_CELCIUS) {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `Current temperature read, ${currentTemp} does not exceed the threshold ${TEMPERATURE_THRESHOLD_IN_CELCIUS}`
      );
    }
    return;
  }

  //Get last sms sent time.
  const notificationObj = await connections.asyncRedisClient.get(userid);

  const dt = !notificationObj
    ? minDate
    : new Date(JSON.parse(notificationObj).last_notification_time);
  const currentDt = Date.now();
  const diffInMinutes = timediff(dt, currentDt, "m");

  const notificationDetails = {
    userid,
    currentDt,
    location,
    message
  };

  //Log.
  if (process.env.NODE_ENV !== "production") {
    const notificationDetailsString = JSON.stringify(notificationDetails);

    console.log({
      difflabel: "diff time min minutes",
      dt,
      currentDt,
      diffInMinutes,
      notificationDetailsString
    });
  }

  if (
    Number.isFinite(diffInMinutes.minutes) &&
    diffInMinutes.minutes >= MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION
  ) {
    notificationDetails.message = `Alert! Temperature threshold of ${TEMPERATURE_THRESHOLD_IN_CELCIUS} has exceeded! Current temperature in ${location} is ${currentTemp}`;
    awsNotification.sendNotification(notificationDetails);
  } else {
    console.log("time threshold has not exceeded. Ignore!");
  }
});

connections.redisSubscriber.subscribe("insert");
