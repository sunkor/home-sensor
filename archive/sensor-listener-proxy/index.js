const express = require("express");
const bodyParser = require("body-parser");
const apigClientFactory = require("aws-api-gateway-client").default;
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const app = express();
app.use(bodyParser.json());

var apigClient = apigClientFactory.newClient({
  invokeUrl: process.env.AWS_API_ENDPOINT,
  region: process.env.AWS_REGION,
  accessKey: process.env.AWS_ACCESS_KEY,
  secretKey: process.env.AWS_SECRET_KEY
});

app.post("/", (req, res) => {
  const pathParams = {};
  const pathTemplate = "";
  const method = "POST";
  const additionalParams = {};
  const body = req.body;

  if (process.env.NODE_ENV !== "production") {
    console.log({
      invokeUrl: process.env.AWS_API_ENDPOINT,
      region: process.env.AWS_REGION
    });
  }

  apigClient
    .invokeApi(pathParams, pathTemplate, method, additionalParams, body)
    .then(result => {
      console.log("success, result - " + result);
    })
    .catch(err => {
      console.log("failed, result - " + err);
    });

  console.log(req.body);
  res.json(req.body);
});

app.listen(8081, () => {
  console.log(`Listening on 8081.`);
});
