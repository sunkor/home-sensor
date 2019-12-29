const Influx = require("influx");
const os = require("os");

var min = 4;
var max = 5;
var random = Math.floor(Math.random() * (+max - +min)) + +min;

const influx = new Influx.InfluxDB({
  host: "localhost",
  database: "express_response_db",
  schema: [
    {
      measurement: "response_times",
      fields: {
        path: Influx.FieldType.STRING,
        duration: Influx.FieldType.INTEGER
      },
      tags: ["host"]
    }
  ]
});

influx
  .writePoints([
    {
      measurement: "response_times",
      tags: { host: os.hostname() },
      fields: { duration: random, path: "testpath" }
    }
  ])
  .then(() => {
    return influx.query(`
    select * from response_times
    where host = ${Influx.escape.stringLit(os.hostname())}
    order by time desc
    limit 10
  `);
  })
  .then(rows => {
    rows.forEach(row =>
      console.log(`A request to ${row.path} took ${row.duration}ms`)
    );
  });
