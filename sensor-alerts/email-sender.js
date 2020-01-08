if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// Load the AWS SDK for Node.js
var AWS = require("aws-sdk");

const sesConfig = {
  apiVersion: "2010-12-01",
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION
};

// Handle promise's fulfilled/rejected states
module.exports.sendEmailAlert = emailToSend => {
  // Create sendEmail params
  var params = {
    Source: emailToSend.from,
    Destination: {
      ToAddresses: [emailToSend.to]
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

  new AWS.SES(sesConfig)
    .sendEmail(params)
    .promise()
    .then(res => {
      console.log("email sent successfully");
    })
    .catch(err => {
      console.error(err, err.stack);
    });
};
