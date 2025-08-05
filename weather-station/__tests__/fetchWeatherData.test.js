const { fetchWeatherData } = require('../index');

describe('fetchWeatherData', () => {
  test('returns json when response is ok', async () => {
    const data = { value: 1 };
    const fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(data)
    });
    const result = await fetchWeatherData(fetch, 'http://example.com');
    expect(fetch).toHaveBeenCalledWith('http://example.com');
    expect(result).toEqual(data);
  });

  test('throws error when response is not ok', async () => {
    const fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchWeatherData(fetch, 'http://example.com')).rejects.toThrow('HTTP error! status: 500');
  });
});
