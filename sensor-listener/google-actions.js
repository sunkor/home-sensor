// Import the appropriate service and chosen wrappers
const { dialogflow } = require("actions-on-google");
const influx = require("./common").influx;
const moment = require("moment-timezone");

// Create an app instance
const app = dialogflow();

// Register handlers for Dialogflow intents
app.intent("get-home-room-location-temperature", async (conv, params) => {
  const supportedLocations = ["study room", "studyroom"];
  if (supportedLocations.includes(params.RoomLocation)) {
    let message;
    try {
      const result = await influx.query(
        `
      SELECT * FROM temperature_data_in_celcius
      where location='study_room' GROUP BY * ORDER BY DESC LIMIT 1
    `
      );

      console.log(JSON.stringify(result)); // [{"time":"2020-01-12T04:17:08.776Z","temperature":25,"location":"study_room"}]

      const timeString = moment(result[0].time)
        .tz("Australia/Sydney")
        .format("DD MMM YYYY, h mm a");

      const temperature = result[0].temperature;
      const floatTemperature = parseFloat(temperature);

      if (isNaN(floatTemperature)) {
        message = `Temperature could not be read.`;
      } else {
        message = `The last temperature in ${result[0].location.replace(/_/g, " ")} was ${Math.round(floatTemperature * 100) / 100} degrees Celsius at ${timeString}`;
      }
    } catch (error) {
      console.log(JSON.stringify(error));
      message = `An error occurred while trying to fetch the last temperature.`;
    }
    console.log(message);
    conv.close(message);
  } else {
    const location = params.RoomLocation || "that location";
    conv.close(`Sorry, I don't have data for ${location}.`);
  }
});

app.fallback(conv => {
  conv.ask(`I couldn't understand. Can you say that again?`);
});

exports.fulfillment = app;

// app.post("/webhook", (req, res) => {
//   console.log("Received a POST request on /webhook");

//   if (!req.body) return res.sendStatus(400);

//   res.setHeader("Content-Type", "application/json");
//   console.log(
//     "Here is the request from Dialogflow, " + JSON.stringify(req.body)
//   );

//   const location = req.body.queryResult.parameters["location"];
//   console.log("location is , " + location);

//   const w = "weather is nothing 2.";
//   const response = "";
//   const responseObj = {
//     fulfillmentText: response,
//     fulfillmentMessages: [{ text: { text: [w] } }]
//   };
//   console.log("Response to Dialogflow, " + JSON.stringify(responseObj));
//   return res.send(JSON.stringify(responseObj));
// });
