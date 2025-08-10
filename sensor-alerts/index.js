const timediff = require("timediff");
const notification = require("./notification");
const minDate = new Date("01 Nov 1970");
const connections = require("./connections");
const config = require("./config/config");

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

(async () => {
  try {
    await connections.redisSubscriber.subscribe("insert", async message => {
      if (process.env.NODE_ENV !== "production") {
        console.log("message received, " + message);
      }

  let parsedMessage;
  try {
    parsedMessage = JSON.parse(message);
  } catch (err) {
    console.warn("Failed to parse message", err);
    return;
  }

  const { userid, location, current_temperature } = parsedMessage;

  //Check required fields.
  if (
    !userid ||
    !location ||
    current_temperature === undefined ||
    current_temperature === null
  ) {
    console.warn(
      "Missing required fields {userid, or location, or current_temperature} from message."
    );
    return;
  }

  const currentTemp = Number(current_temperature);
  if (!Number.isFinite(currentTemp)) {
    console.warn(
      `Invalid current_temperature received: ${current_temperature}`
    );
    return;
  }

  //Check threshold.
  if (currentTemp < TEMPERATURE_THRESHOLD_IN_CELSIUS) {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `Current temperature read, ${currentTemp} does not exceed the threshold ${TEMPERATURE_THRESHOLD_IN_CELSIUS}`
      );
    }
    return;
  }

  //Get last sms sent time.
  let notificationObj;
  try {
    notificationObj = await connections.redisClient.get(userid);
  } catch (err) {
    console.warn("Failed to get last notification time from Redis", err);
    notificationObj = null;
  }

  const dt = !notificationObj
    ? minDate
    : new Date(JSON.parse(notificationObj).last_notification_time);
  const currentDt = Date.now();
  const diffInMinutes = timediff(dt, currentDt, "m");

  const notificationDetails = {
    userid,
    currentDt,
    location
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
    notificationDetails.message = `Alert! Temperature threshold of ${TEMPERATURE_THRESHOLD_IN_CELSIUS} has exceeded! Current temperature in ${location} is ${currentTemp}`;
    try {
      await notification.sendNotification(notificationDetails);
    } catch (err) {
      console.error("Failed to send notification", err);
    }
    } else {
      console.log("time threshold has not exceeded. Ignore!");
    }
  });
  } catch (err) {
    console.error("Failed to subscribe to Redis channel 'insert'", err);
    process.exit(1);
  }
})();
