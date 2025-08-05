const { validatePayload } = require('../index');

describe('validatePayload', () => {
  test('rejects invalid payload', () => {
    const req = { body: { temperature: 'hot', location: '' } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();
    validatePayload(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Invalid payload');
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts valid payload', () => {
    const req = { body: { temperature: 20, location: 'kitchen' } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();
    validatePayload(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
