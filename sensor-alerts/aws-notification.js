const sendMsg = require("aws-sns-sms");
const emailSender = require("./email-sender");
const connections = require("./connections");

const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION
};

//Send SMS via AWS SNS.
async function sendSMS(message, currentDt) {
  if (process.env.ENABLE_SMS_ALERTS === "true") {
    const smsMessage = {
      message: message,
      sender: process.env.SMS_SENDER,
      phoneNumber: process.env.SMS_PHONE_NUMBER // phoneNumber along with country code
    };

    if (process.env.NODE_ENV !== "production") {
      console.log("message to send - " + smsMessage.message);
    }

    sendMsg(awsConfig, smsMessage)
      .then(data => {
        const timestamp = currentDt || Date.now();
        console.log("Message sent at: " + timestamp);
      })
      .catch(err => {
        console.log("Error occured - " + err);
      });
  } else {
    console.log(`SMS alerts is disabled. Cannot send alert message ${message}`);
  }
}

//Send e-mail via AWS SES.
async function sendEmail(location, message) {
  if (process.env.ENABLE_EMAIL_ALERTS === "true") {
    const emailToSend = {
      from: `${process.env.EMAIL_FROM} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: process.env.EMAIL_LIST,
      subject: `Alert! Temperature in ${location} has exceeded threshold`,
      content: message
    };
    console.log(emailToSend);
    emailSender.sendEmailAlert(emailToSend);
  } else {
    console.log(
      `Email alerts is disabled. Cannot send alert message ${message}`
    );
  }
}

async function sendNotification(notificationDetails) {
  sendSMS(notificationDetails.message, notificationDetails.currentDt);
  sendEmail(notificationDetails.location, notificationDetails.message);
  await connections.asyncRedisClient.set(
    notificationDetails.userid,
    JSON.stringify({
      last_notification_time: notificationDetails.currentDt
    })
  );
}

module.exports.sendNotification = sendNotification;
