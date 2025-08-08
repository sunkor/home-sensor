const twilio = require("twilio");
const sgMail = require("@sendgrid/mail");
const connections = require("./connections");
const config = require("../config/config");

let twilioClient;
const requiredTwilioVars = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER"
];
const missingTwilioVars = requiredTwilioVars.filter(v => !config[v]);
const twilioConfigValid = missingTwilioVars.length === 0;
if (!twilioConfigValid) {
  console.error(
    `Missing Twilio config env vars: ${missingTwilioVars.join(", ")}`
  );
} else {
  twilioClient = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
}

const requiredSendgridVars = ["SENDGRID_API_KEY"];
const missingSendgridVars = requiredSendgridVars.filter(v => !config[v]);
const sendgridConfigValid = missingSendgridVars.length === 0;
if (!sendgridConfigValid) {
  console.error(
    `Missing SendGrid config env vars: ${missingSendgridVars.join(", ")}`
  );
} else {
  sgMail.setApiKey(config.SENDGRID_API_KEY);
}

//Send SMS via Twilio.
async function sendSMS(message, currentDt) {
  if (config.ENABLE_SMS_ALERTS) {
    if (!twilioConfigValid) {
      console.error("Twilio config missing. Cannot send SMS alert");
      return false;
    }
    const requiredSmsVars = ["SMS_PHONE_NUMBER"];
    const missingSmsVars = requiredSmsVars.filter(v => !config[v]);
    if (missingSmsVars.length) {
      console.error(
        `Missing SMS env vars: ${missingSmsVars.join(", ")}`
      );
      return false;
    }
    if (process.env.NODE_ENV !== "production") {
      console.log("message to send - " + message);
    }
    try {
      await twilioClient.messages.create({
        body: message,
        from: config.TWILIO_PHONE_NUMBER,
        to: config.SMS_PHONE_NUMBER
      });
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

//Send e-mail via SendGrid.
async function sendEmail(location, message) {
  if (config.ENABLE_EMAIL_ALERTS) {
    if (!sendgridConfigValid) {
      console.error("SendGrid config missing. Cannot send email alert");
      return false;
    }
    const requiredEmailVars = ["EMAIL_FROM_ADDRESS", "EMAIL_LIST"];
    const missingEmailVars = requiredEmailVars.filter(v => !config[v]);
    if (missingEmailVars.length) {
      console.error(
        `Missing email env vars: ${missingEmailVars.join(", ")}`
      );
      return false;
    }
    const emailToSend = {
      to: config.EMAIL_LIST.split(","),
      from: {
        name: config.EMAIL_FROM,
        email: config.EMAIL_FROM_ADDRESS
      },
      subject: `Alert! Temperature in ${location} has exceeded threshold`,
      text: message
    };
    if (process.env.NODE_ENV !== "production") {
      console.log(emailToSend);
    }
    try {
      await sgMail.send(emailToSend);
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
  let smsSent;
  if (config.ENABLE_SMS_ALERTS) {
    smsSent = await sendSMS(
      notificationDetails.message,
      notificationDetails.currentDt
    );
    if (!smsSent) {
      console.error("Failed to send SMS alert");
    }
  }

  let emailSent;
  if (config.ENABLE_EMAIL_ALERTS) {
    emailSent = await sendEmail(
      notificationDetails.location,
      notificationDetails.message
    );
    if (!emailSent) {
      console.error("Failed to send email alert");
    }
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
