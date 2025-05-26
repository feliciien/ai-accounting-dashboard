import { getEnvVar } from './envValidator';

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface ExchangeRateCache {
  [key: string]: {
    rate: number;
    timestamp: number;
  };
}

const rateCache: ExchangeRateCache = {};

export const convertCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const cacheKey = `${fromCurrency}_${toCurrency}`;
  const cachedRate = rateCache[cacheKey];
  const now = Date.now();

  if (cachedRate && now - cachedRate.timestamp < CACHE_DURATION) {
    return amount * cachedRate.rate;
  }

  try {
    // Get API key using the validator
    const apiKey = getEnvVar('REACT_APP_EXCHANGE_RATE_API_KEY');

    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${fromCurrency}/${toCurrency}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch exchange rate');
    }

    const data = await response.json();
    const rate = data.conversion_rate;

    // Cache the new rate
    rateCache[cacheKey] = {
      rate,
      timestamp: now,
    };

    return amount * rate;
  } catch (error) {
    console.error('Currency conversion error:', error);
    // If API call fails, try to use cached rate even if expired
    if (cachedRate) {
      console.warn('Using expired cached exchange rate');
      return amount * cachedRate.rate;
    }
    // Return original amount if no conversion possible
    return amount;
  }
};