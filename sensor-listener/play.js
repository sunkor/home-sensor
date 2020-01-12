const express = require("express");
const bodyParser = require("body-parser");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const app = express();
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("hello world, now lets get serious shall well?");
});

app.post("/fulfillment", require("./google-actions").fulfillment);

app.post("/webhook", (req, res) => {
  console.log("Received a POST request on /webhook");

  if (!req.body) return res.sendStatus(400);

  res.setHeader("Content-Type", "application/json");
  console.log(
    "Here is the request from Dialogflow, " + JSON.stringify(req.body)
  );

  const location = req.body.queryResult.parameters["location"];
  console.log("location is , " + location);

  const w = "weather is nothing 2.";
  const response = "";
  const responseObj = {
    fulfillmentText: response,
    fulfillmentMessages: [{ text: { text: [w] } }]
  };
  console.log("Response to Dialogflow, " + JSON.stringify(responseObj));
  return res.send(JSON.stringify(responseObj));
});

app.listen(8080, () => {
  console.log(`Listening on 8080.`);
});
