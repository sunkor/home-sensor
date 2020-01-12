// Import the appropriate service and chosen wrappers
const { dialogflow } = require("actions-on-google");
const influx = require("./common").influx;
const moment = require("moment-timezone");

// Create an app instance
const app = dialogflow();

// Register handlers for Dialogflow intents
app.intent("get-home-room-location-temperature", async (conv, params) => {
  if (
    params.RoomLocation === "study room" ||
    params.RoomLocation === "studyroom"
  ) {
    console.log(
      "Hi there, I received the intent successfully3." + JSON.stringify(params)
    );

    const message = await influx
      .query(
        `
      SELECT * FROM temperature_data_in_celcius
      where location='study_room' GROUP BY * ORDER BY DESC LIMIT 1
    `
      )
      .then(result => {
        console.log(JSON.stringify(result)); // [{"time":"2020-01-12T04:17:08.776Z","temperature":25,"location":"study_room"}]

        const timeString = moment(result[0].time)
          .tz("Australia/Sydney")
          .format("DD MMM YYYY, h mm ha");

        return `The last temperature in ${result[0].location.replace(
          "_",
          " "
        )} was ${result[0].temperature} degrees celcius at ${timeString}`;
      })
      .catch(error => {
        console.log(JSON.stringify(error));
        return `An error occured while trying to fetch the last temperature.`;
      });
    console.log(message);
    conv.close(message);
  } else {
    conv.ask(`I didn't understand. Can you tell me something else?`);
  }
});

app.fallback(conv => {
  conv.ask(`I couldn't understand. Can you say that again?`);
});

exports.fulfillment = app;
