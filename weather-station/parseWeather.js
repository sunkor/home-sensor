const d2d = require("degrees-to-direction");

function parseWeatherData(json) {
  if (!json || !json.location || !json.current) {
    throw new Error("Invalid WeatherAPI response");
  }
  const current = json.current;
  return {
    name: json.location.name,
    currentTemp: current.temp_c,
    feels_like: current.feelslike_c,
    temp_min: current.temp_c,
    temp_max: current.temp_c,
    humidity: current.humidity,
    wind_speed: isNaN(current.wind_kph) ? 0 : current.wind_kph,
    wind_direction: isNaN(current.wind_degree) ? 0 : current.wind_degree,
    wind_direction_desc: current.wind_dir || (isNaN(current.wind_degree) ? "n/a" : d2d(current.wind_degree)),
    gust_speed: isNaN(current.gust_kph) ? 0 : current.gust_kph,
    sunrise: 0,
    sunset: 0,
    weather_main: current.condition ? current.condition.text : "n/a",
    weather_description: current.condition ? current.condition.text : "n/a",
    sunrise_time: "n/a",
    sunset_time: "n/a",
    timestamp: json.location.localtime_epoch
  };
}

module.exports = { parseWeatherData };
