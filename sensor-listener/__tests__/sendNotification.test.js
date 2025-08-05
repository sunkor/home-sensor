process.env.MINUTES_TO_WAIT_BEFORE_SENDING_NOTIFICATION = '1';
process.env.TEMPERATURE_THRESHOLD_IN_CELSIUS = '30';
jest.mock('../common', () => ({
  asyncRedisClient: { get: jest.fn() },
  redisPublisher: { publish: jest.fn() },
  influx: {}
}));

const { sendNotification } = require('../index');
const { asyncRedisClient, redisPublisher } = require('../common');

describe('sendNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('publishes when threshold exceeded and enough time passed', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const past = new Date(now - 2 * 60 * 1000).toISOString();
    asyncRedisClient.get.mockResolvedValue(
      JSON.stringify({ last_notification_time: past })
    );
    const req = { body: { temperature: 35, location: 'kitchen' } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    await sendNotification(req, res);
    expect(redisPublisher.publish).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith('posted temperature data.');
    Date.now.mockRestore();
  });

  test('does not publish when temperature below threshold', async () => {
    asyncRedisClient.get.mockResolvedValue(null);
    const req = { body: { temperature: 20, location: 'kitchen' } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    await sendNotification(req, res);
    expect(redisPublisher.publish).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith('posted temperature data.');
  });
});
