const moment = require("moment-timezone");

const obj = [
  { time: "2020-01-12T04:17:08.776Z", temperature: 25, location: "study_room" }
];

console.log(JSON.stringify(obj[0]));
console.log({
  "time is": moment(obj[0].time)
    .tz("Australia/Sydney")
    .format("DD MMM YYYY, h mm ha"),
  "temperature is": `${obj[0].temperature} degress celcius`,
  "location is": obj[0].location.replace("_", " ")
});

const timeString = moment(obj[0].time)
  .tz("Australia/Sydney")
  .format("DD MMM YYYY, h mm ha");
console.log(
  `The last temperature in ${obj[0].location.replace("_", " ")} was ${
    obj[0].temperature
  } degress celcius at ${timeString}`
);
