if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// Load the AWS SDK for Node.js
const AWS = require("aws-sdk");

const sesConfig = {
  apiVersion: "2010-12-01",
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION
};

// Handle promise's fulfilled/rejected states
module.exports.sendEmailAlert = async emailToSend => {
  // Create sendEmail params
  const params = {
    Source: emailToSend.from,
    Destination: {
      ToAddresses: emailToSend.to.split(",")
    },
    ReplyToAddresses: [emailToSend.from],
    Message: {
      /* required */
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: emailToSend.content
        }
      },
      Subject: {
        Charset: "UTF-8",
        Data: emailToSend.subject
      }
    }
  };

  try {
    const res = await new AWS.SES(sesConfig).sendEmail(params).promise();
    if (process.env.NODE_ENV !== "production") {
      console.log("email sent successfully");
    }
    return res;
  } catch (err) {
    console.error(err, err.stack);
    throw err;
  }
};
