/**
 * Shared formatting utilities for the application.
 */

/**
 * Format a number as currency with appropriate abbreviation.
 * @param {number} value - The value to format
 * @param {object} options - Formatting options
 * @param {number} options.millionDecimals - Decimal places for millions (default: 1)
 * @param {number} options.thousandDecimals - Decimal places for thousands (default: 0)
 * @param {string} options.nullDisplay - What to display for null/invalid values (default: '$0')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, options = {}) => {
  const {
    millionDecimals = 1,
    thousandDecimals = 0,
    nullDisplay = '$0'
  } = options;

  if (value == null || isNaN(value) || !isFinite(value)) {
    return nullDisplay;
  }

  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(millionDecimals)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(thousandDecimals)}K`;
  }
  return `$${value.toFixed(0)}`;
};

/**
 * Format currency for table display (shows em-dash for null values).
 * @param {number} value - The value to format
 * @returns {string} Formatted currency string
 */
export const formatCurrencyTable = (value) => {
  return formatCurrency(value, { millionDecimals: 2, nullDisplay: '—' });
};

/**
 * Format a percentage value.
 * @param {number} value - The value to format (0-1 or 0-100)
 * @param {object} options - Formatting options
 * @param {boolean} options.isDecimal - Whether input is decimal (0-1) or percentage (0-100)
 * @param {number} options.decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, options = {}) => {
  const { isDecimal = true, decimals = 0 } = options;

  if (value == null || isNaN(value)) {
    return '0%';
  }

  const percentValue = isDecimal ? value * 100 : value;
  return `${percentValue.toFixed(decimals)}%`;
};

/**
 * Format a number with locale-aware thousands separators.
 * @param {number} value - The value to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (value) => {
  if (value == null || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString('en-US');
};
