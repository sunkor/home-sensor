const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wait for InfluxDB to be ready by repeatedly calling getDatabaseNames.
 * Resolves with the database names once the call succeeds or rejects after a timeout.
 * @param {InfluxDB} influx - An instance of Influx.InfluxDB
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs=30000] - Maximum time to wait for readiness
 * @param {number} [opts.intervalMs=1000] - Delay between retries
 * @returns {Promise<Array<string>>}
 */
async function waitForInfluxDb(influx, opts = {}) {
  const { timeoutMs = 30000, intervalMs = 1000 } = opts;
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await influx.getDatabaseNames();
    } catch (err) {
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Timed out waiting for InfluxDB: ${err.message}`);
      }
      console.error("InfluxDB not ready, retrying...", err.message);
      await sleep(intervalMs);
    }
  }
}

module.exports = {
  waitForInfluxDb
};
