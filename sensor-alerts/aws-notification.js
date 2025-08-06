const sendMsg = require("aws-sns-sms");
const emailSender = require("./email-sender");
const connections = require("./connections");
const config = require("../config/config");

const awsConfig = {
  accessKeyId: config.AWS_ACCESS_KEY,
  secretAccessKey: config.AWS_SECRET_KEY,
  region: config.AWS_REGION
};

const requiredAwsVars = ["AWS_ACCESS_KEY", "AWS_SECRET_KEY", "AWS_REGION"];
const missingAwsVars = requiredAwsVars.filter(v => !config[v]);
const awsConfigValid = missingAwsVars.length === 0;
if (!awsConfigValid) {
  console.error(
    `Missing AWS config env vars: ${missingAwsVars.join(", ")}`
  );
}

//Send SMS via AWS SNS.
async function sendSMS(message, currentDt) {
  if (config.ENABLE_SMS_ALERTS) {
    if (!awsConfigValid) {
      console.error("AWS config missing. Cannot send SMS alert");
      return false;
    }
    const requiredSmsVars = ["SMS_SENDER", "SMS_PHONE_NUMBER"];
    const missingSmsVars = requiredSmsVars.filter(v => !config[v]);
    if (missingSmsVars.length) {
      console.error(
        `Missing SMS env vars: ${missingSmsVars.join(", ")}`
      );
      return false;
    }
    const smsMessage = {
      message: message,
      sender: config.SMS_SENDER,
      phoneNumber: config.SMS_PHONE_NUMBER // phoneNumber along with country code
    };

    if (process.env.NODE_ENV !== "production") {
      console.log("message to send - " + smsMessage.message);
    }

    try {
      await sendMsg(awsConfig, smsMessage);
      const timestamp = currentDt || Date.now();
      console.log("Message sent at: " + timestamp);
      return true;
    } catch (err) {
      console.error("Error occured - " + err);
      return false;
    }
  } else {
    console.log(`SMS alerts is disabled. Cannot send alert message ${message}`);
    return false;
  }
}

//Send e-mail via AWS SES.
async function sendEmail(location, message) {
  if (config.ENABLE_EMAIL_ALERTS) {
    if (!awsConfigValid) {
      console.error("AWS config missing. Cannot send email alert");
      return false;
    }
    const requiredEmailVars = [
      "EMAIL_FROM",
      "EMAIL_FROM_ADDRESS",
      "EMAIL_LIST"
    ];
    const missingEmailVars = requiredEmailVars.filter(v => !config[v]);
    if (missingEmailVars.length) {
      console.error(
        `Missing email env vars: ${missingEmailVars.join(", ")}`
      );
      return false;
    }
    const emailToSend = {
      from: `${config.EMAIL_FROM} <${config.EMAIL_FROM_ADDRESS}>`,
      to: config.EMAIL_LIST,
      subject: `Alert! Temperature in ${location} has exceeded threshold`,
      content: message
    };
    if (process.env.NODE_ENV !== "production") {
      console.log(emailToSend);
    }
    try {
      await emailSender.sendEmailAlert(emailToSend);
      return true;
    } catch (err) {
      console.error("Error occured while sending email - " + err);
      return false;
    }
  } else {
    console.log(
      `Email alerts is disabled. Cannot send alert message ${message}`
    );
    return false;
  }
}

async function sendNotification(notificationDetails) {
  const smsSent = await sendSMS(
    notificationDetails.message,
    notificationDetails.currentDt
  );
  if (!smsSent) {
    console.error("Failed to send SMS alert");
  }

  const emailSent = await sendEmail(
    notificationDetails.location,
    notificationDetails.message
  );
  if (!emailSent) {
    console.error("Failed to send email alert");
  }
  await connections.redisClient.set(
    notificationDetails.userid,
    JSON.stringify({
      last_notification_time: notificationDetails.currentDt
    })
  );
  return { smsSent, emailSent };
}

module.exports.sendNotification = sendNotification;
