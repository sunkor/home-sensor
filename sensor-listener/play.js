const temperature = "25.875";
const floatTemperature = parseFloat(temperature);
console.log(
  isNaN(floatTemperature)
    ? "not available"
    : Math.round(floatTemperature * 100) / 100
);
