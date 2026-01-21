"""Statistical helper functions for Monte Carlo simulations."""
import numpy as np
from typing import Tuple, List, Dict, Any
from scipy import stats


def calculate_percentiles(
    data: np.ndarray,
    percentiles: List[float] = [5, 10, 25, 50, 75, 90, 95]
) -> Dict[str, float]:
    """Calculate percentiles of a distribution."""
    results = {}
    for p in percentiles:
        results[f"p{p}"] = float(np.percentile(data, p))
    return results


def calculate_statistics(data: np.ndarray) -> Dict[str, float]:
    """Calculate comprehensive statistics for simulation results."""
    return {
        "mean": float(np.mean(data)),
        "median": float(np.median(data)),
        "std": float(np.std(data)),
        "min": float(np.min(data)),
        "max": float(np.max(data)),
        "skewness": float(stats.skew(data)),
        "kurtosis": float(stats.kurtosis(data)),
        "var_95": float(np.percentile(data, 5)),
        "var_99": float(np.percentile(data, 1)),
    }


def calculate_var(
    returns: np.ndarray,
    confidence_level: float = 0.95,
    portfolio_value: float = 1.0
) -> float:
    """Calculate Value at Risk at specified confidence level."""
    return float(np.percentile(returns, (1 - confidence_level) * 100) * portfolio_value)


def calculate_cvar(
    returns: np.ndarray,
    confidence_level: float = 0.95,
    portfolio_value: float = 1.0
) -> float:
    """Calculate Conditional Value at Risk (Expected Shortfall)."""
    var = calculate_var(returns, confidence_level, 1.0)
    cvar = returns[returns <= var].mean()
    return float(cvar * portfolio_value)


def calculate_sharpe_ratio(
    returns: np.ndarray,
    risk_free_rate: float = 0.02,
    periods_per_year: int = 252
) -> float:
    """Calculate annualized Sharpe ratio."""
    excess_returns = returns - risk_free_rate / periods_per_year
    if np.std(excess_returns) == 0:
        return 0.0
    return float(np.mean(excess_returns) / np.std(excess_returns) * np.sqrt(periods_per_year))


def calculate_max_drawdown(values: np.ndarray) -> Tuple[float, int, int]:
    """
    Calculate maximum drawdown and its position.

    Returns:
        Tuple of (max_drawdown, peak_index, trough_index)
    """
    peak = values[0]
    peak_idx = 0
    max_dd = 0
    max_dd_peak_idx = 0
    max_dd_trough_idx = 0

    for i, value in enumerate(values):
        if value > peak:
            peak = value
            peak_idx = i

        drawdown = (peak - value) / peak if peak > 0 else 0
        if drawdown > max_dd:
            max_dd = drawdown
            max_dd_peak_idx = peak_idx
            max_dd_trough_idx = i

    return float(max_dd), max_dd_peak_idx, max_dd_trough_idx


def calculate_probability_of_success(
    final_values: np.ndarray,
    target: float
) -> float:
    """Calculate probability of reaching a target value."""
    return float(np.mean(final_values >= target))


def calculate_safe_withdrawal_rate(
    final_values: np.ndarray,
    initial_value: float,
    target_success_rate: float = 0.95
) -> float:
    """Estimate safe withdrawal rate for given success probability."""
    sorted_values = np.sort(final_values)
    idx = int((1 - target_success_rate) * len(sorted_values))
    conservative_final = sorted_values[idx]

    if initial_value <= 0:
        return 0.0

    return float(conservative_final / initial_value * 0.04)


def generate_correlated_returns(
    means: np.ndarray,
    stds: np.ndarray,
    correlation_matrix: np.ndarray,
    n_samples: int,
    random_state: np.random.Generator = None
) -> np.ndarray:
    """Generate correlated random returns using Cholesky decomposition."""
    if random_state is None:
        random_state = np.random.default_rng()

    n_assets = len(means)
    L = np.linalg.cholesky(correlation_matrix)

    uncorrelated = random_state.standard_normal((n_samples, n_assets))
    correlated = uncorrelated @ L.T

    returns = correlated * stds + means
    return returns


def annualize_return(periodic_return: float, periods_per_year: int = 12) -> float:
    """Convert periodic return to annualized return."""
    return float((1 + periodic_return) ** periods_per_year - 1)


def deannualize_return(annual_return: float, periods_per_year: int = 12) -> float:
    """Convert annual return to periodic return."""
    return float((1 + annual_return) ** (1 / periods_per_year) - 1)


def annualize_volatility(periodic_volatility: float, periods_per_year: int = 12) -> float:
    """Convert periodic volatility to annualized volatility."""
    return float(periodic_volatility * np.sqrt(periods_per_year))


def deannualize_volatility(annual_volatility: float, periods_per_year: int = 12) -> float:
    """Convert annual volatility to periodic volatility."""
    return float(annual_volatility / np.sqrt(periods_per_year))
