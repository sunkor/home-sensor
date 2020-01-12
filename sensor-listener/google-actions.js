// Import the appropriate service and chosen wrappers
const { actionssdk } = require("actions-on-google");
const influx = require("./common").influx;
const moment = require("moment-timezone");

// Create an app instance
const app = actionssdk();

// Register handlers for Dialogflow intents
app.intent("actions.intent.TEXT", (conv, params) => {
  if (params === "study room" || params === "studyroom") {
    console.log(
      "Hi there, I received the intent successfully." + JSON.stringify(params)
    );

    var message = `The last temperature in study room was 28 degress celcius at 31 December 1 15 pm.`;
    influx
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

        message = `The last temperature in ${result[0].location.replace(
          "_",
          " "
        )} was ${result[0].temperature} degress celcius at ${timeString}`;
        console.log("database returned, " + message);
        //response.status(200).json(result);
      })
      .catch(error => {
        console.log(JSON.stringify(error));
        message = `An error occured while trying to fetch the last temperature.`;
        console.log("error occured while fetching from database, " + message);
        //response.status(500).json({ error });
      });

    return conv.close(message);
  }
  conv.ask(`I didn't understand. Can you tell me something else?`);
});

app.fallback(conv => {
  conv.ask(`I couldn't understand. Can you say that again?`);
});

exports.fulfillment = app;
