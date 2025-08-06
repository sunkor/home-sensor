const sendMsg = require("aws-sns-sms");
const emailSender = require("./email-sender");
const connections = require("./connections");

const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION
};

const requiredAwsVars = ["AWS_ACCESS_KEY", "AWS_SECRET_KEY", "AWS_REGION"];
const missingAwsVars = requiredAwsVars.filter(v => !process.env[v]);
const awsConfigValid = missingAwsVars.length === 0;
if (!awsConfigValid) {
  console.error(
    `Missing AWS config env vars: ${missingAwsVars.join(", ")}`
  );
}

//Send SMS via AWS SNS.
async function sendSMS(message, currentDt) {
  if (process.env.ENABLE_SMS_ALERTS === "true") {
    if (!awsConfigValid) {
      console.error("AWS config missing. Cannot send SMS alert");
      return false;
    }
    const requiredSmsVars = ["SMS_SENDER", "SMS_PHONE_NUMBER"];
    const missingSmsVars = requiredSmsVars.filter(v => !process.env[v]);
    if (missingSmsVars.length) {
      console.error(
        `Missing SMS env vars: ${missingSmsVars.join(", ")}`
      );
      return false;
    }
    const smsMessage = {
      message: message,
      sender: process.env.SMS_SENDER,
      phoneNumber: process.env.SMS_PHONE_NUMBER // phoneNumber along with country code
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
  if (process.env.ENABLE_EMAIL_ALERTS === "true") {
    if (!awsConfigValid) {
      console.error("AWS config missing. Cannot send email alert");
      return false;
    }
    const requiredEmailVars = [
      "EMAIL_FROM",
      "EMAIL_FROM_ADDRESS",
      "EMAIL_LIST"
    ];
    const missingEmailVars = requiredEmailVars.filter(v => !process.env[v]);
    if (missingEmailVars.length) {
      console.error(
        `Missing email env vars: ${missingEmailVars.join(", ")}`
      );
      return false;
    }
    const emailToSend = {
      from: `${process.env.EMAIL_FROM} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: process.env.EMAIL_LIST,
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
