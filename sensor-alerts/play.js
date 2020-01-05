//console.log(new Date("01 Nov 1970"));
const timediff = require("timediff");

var MS_PER_MINUTE = 60000;
var currentDt = new Date(Date.now());
var dt = new Date(currentDt - 10 * MS_PER_MINUTE);

let diffInMinutes = timediff(dt, currentDt, "m");

const THRESHOLD = 10;
console.log(dt);
console.log(currentDt);
console.log(
  diffInMinutes.minutes >= THRESHOLD ? "send alert" : "do not send alert"
);

const minDate = new Date("01 Nov 1970");
diffInMinutes = timediff(minDate, currentDt, "m");
console.log(diffInMinutes);
