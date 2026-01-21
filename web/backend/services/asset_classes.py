"""
Capital Market Assumptions for Monte Carlo Simulation.

Based on 2024-2025 data from:
- Vanguard Capital Markets Model
- BlackRock Capital Market Assumptions
- J.P. Morgan Long-Term Capital Market Assumptions
- Morningstar/Research Affiliates
"""
import numpy as np
from typing import Dict, Tuple
from dataclasses import dataclass


@dataclass
class AssetClass:
    """Represents an asset class with expected return and volatility."""
    name: str
    expected_return: float  # Annual nominal return
    volatility: float  # Annual standard deviation


# Capital Market Assumptions (10-year forward-looking, nominal)
# Sources: Vanguard, BlackRock, JPMorgan consensus 2024-2025
ASSET_CLASSES = {
    "us_large_cap": AssetClass("US Large Cap Stocks", 0.052, 0.165),
    "us_small_cap": AssetClass("US Small Cap Stocks", 0.071, 0.200),
    "intl_developed": AssetClass("International Developed", 0.068, 0.175),
    "emerging_markets": AssetClass("Emerging Markets", 0.075, 0.230),
    "us_bonds": AssetClass("US Aggregate Bonds", 0.045, 0.055),
    "tips": AssetClass("TIPS (Inflation Protected)", 0.040, 0.065),
    "high_yield": AssetClass("High Yield Bonds", 0.058, 0.100),
    "intl_bonds": AssetClass("International Bonds", 0.042, 0.080),
    "cash": AssetClass("Cash/Money Market", 0.035, 0.010),
    "reits": AssetClass("REITs", 0.065, 0.190),
}

# Correlation matrix based on historical data (1990-2024)
# Order: us_large, us_small, intl_dev, em, us_bonds, tips, hy, intl_bonds, cash, reits
CORRELATION_MATRIX = np.array([
    [1.00, 0.88, 0.85, 0.72, 0.05, 0.05, 0.58, 0.15, 0.02, 0.65],  # US Large Cap
    [0.88, 1.00, 0.78, 0.70, -0.05, 0.00, 0.55, 0.10, 0.00, 0.70],  # US Small Cap
    [0.85, 0.78, 1.00, 0.82, 0.10, 0.08, 0.55, 0.45, 0.03, 0.60],  # Intl Developed
    [0.72, 0.70, 0.82, 1.00, 0.12, 0.10, 0.52, 0.35, 0.02, 0.55],  # Emerging Markets
    [0.05, -0.05, 0.10, 0.12, 1.00, 0.85, 0.35, 0.65, 0.25, 0.20],  # US Bonds
    [0.05, 0.00, 0.08, 0.10, 0.85, 1.00, 0.30, 0.55, 0.20, 0.18],  # TIPS
    [0.58, 0.55, 0.55, 0.52, 0.35, 0.30, 1.00, 0.40, 0.05, 0.50],  # High Yield
    [0.15, 0.10, 0.45, 0.35, 0.65, 0.55, 0.40, 1.00, 0.15, 0.25],  # Intl Bonds
    [0.02, 0.00, 0.03, 0.02, 0.25, 0.20, 0.05, 0.15, 1.00, 0.05],  # Cash
    [0.65, 0.70, 0.60, 0.55, 0.20, 0.18, 0.50, 0.25, 0.05, 1.00],  # REITs
])

ASSET_ORDER = [
    "us_large_cap", "us_small_cap", "intl_developed", "emerging_markets",
    "us_bonds", "tips", "high_yield", "intl_bonds", "cash", "reits"
]


def get_risk_based_allocation(risk_tolerance: int, years_to_retirement: int) -> Dict[str, float]:
    """
    Get asset allocation based on risk tolerance and time horizon.

    Uses a glide path that becomes more conservative as retirement approaches.
    Risk tolerance: 1-10 scale
    """
    # Base equity allocation by risk tolerance (for someone 30+ years from retirement)
    base_equity = {
        1: 0.20,   # Very conservative
        2: 0.30,
        3: 0.40,
        4: 0.50,
        5: 0.60,   # Moderate
        6: 0.70,
        7: 0.75,
        8: 0.80,
        9: 0.85,
        10: 0.90,  # Aggressive
    }.get(risk_tolerance, 0.60)

    # Glide path: reduce equity as retirement approaches
    # At 30+ years: full equity allocation
    # At 0 years (retirement): reduce by 20-30%
    if years_to_retirement >= 30:
        glide_factor = 1.0
    elif years_to_retirement <= 0:
        glide_factor = 0.70  # In retirement
    else:
        # Linear interpolation
        glide_factor = 0.70 + (0.30 * years_to_retirement / 30)

    equity_pct = base_equity * glide_factor
    bond_pct = 1.0 - equity_pct

    # Distribute within equity (more diversified for moderate risk)
    if risk_tolerance <= 3:
        # Conservative: more large cap, less international
        allocation = {
            "us_large_cap": equity_pct * 0.60,
            "us_small_cap": equity_pct * 0.10,
            "intl_developed": equity_pct * 0.20,
            "emerging_markets": equity_pct * 0.05,
            "reits": equity_pct * 0.05,
            "us_bonds": bond_pct * 0.60,
            "tips": bond_pct * 0.20,
            "high_yield": bond_pct * 0.05,
            "intl_bonds": bond_pct * 0.10,
            "cash": bond_pct * 0.05,
        }
    elif risk_tolerance <= 7:
        # Moderate: balanced approach
        allocation = {
            "us_large_cap": equity_pct * 0.45,
            "us_small_cap": equity_pct * 0.15,
            "intl_developed": equity_pct * 0.25,
            "emerging_markets": equity_pct * 0.10,
            "reits": equity_pct * 0.05,
            "us_bonds": bond_pct * 0.50,
            "tips": bond_pct * 0.15,
            "high_yield": bond_pct * 0.15,
            "intl_bonds": bond_pct * 0.15,
            "cash": bond_pct * 0.05,
        }
    else:
        # Aggressive: more small cap and international
        allocation = {
            "us_large_cap": equity_pct * 0.35,
            "us_small_cap": equity_pct * 0.20,
            "intl_developed": equity_pct * 0.25,
            "emerging_markets": equity_pct * 0.15,
            "reits": equity_pct * 0.05,
            "us_bonds": bond_pct * 0.40,
            "tips": bond_pct * 0.10,
            "high_yield": bond_pct * 0.25,
            "intl_bonds": bond_pct * 0.20,
            "cash": bond_pct * 0.05,
        }

    return allocation


def generate_correlated_returns(
    n_periods: int,
    n_simulations: int,
    allocation: Dict[str, float],
    annual_fee: float = 0.0,
    periods_per_year: int = 12,
    use_fat_tails: bool = True,
    degrees_of_freedom: float = 5.0,
    random_state: np.random.Generator = None
) -> np.ndarray:
    """
    Generate correlated portfolio returns using Cholesky decomposition.

    Args:
        n_periods: Number of periods to simulate
        n_simulations: Number of simulation paths
        allocation: Dict of asset class -> weight
        annual_fee: Annual advisory/management fee (e.g., 0.01 for 1%)
        periods_per_year: 12 for monthly, 252 for daily
        use_fat_tails: If True, use Student-t distribution for more realistic tails
        degrees_of_freedom: For Student-t (lower = fatter tails, 5 is common)
        random_state: Random number generator

    Returns:
        Array of shape (n_simulations, n_periods) with portfolio returns
    """
    if random_state is None:
        random_state = np.random.default_rng()

    # Build arrays for active asset classes
    active_assets = [a for a in ASSET_ORDER if allocation.get(a, 0) > 0]
    n_assets = len(active_assets)

    if n_assets == 0:
        return np.zeros((n_simulations, n_periods))

    # Get indices for correlation submatrix
    indices = [ASSET_ORDER.index(a) for a in active_assets]

    # Extract submatrix
    corr_sub = CORRELATION_MATRIX[np.ix_(indices, indices)]

    # Get expected returns and volatilities (convert to periodic)
    dt = 1.0 / periods_per_year
    means = np.array([ASSET_CLASSES[a].expected_return * dt for a in active_assets])
    stds = np.array([ASSET_CLASSES[a].volatility * np.sqrt(dt) for a in active_assets])
    weights = np.array([allocation[a] for a in active_assets])

    # Ensure weights sum to 1
    weights = weights / weights.sum()

    # Subtract periodic fee from returns
    periodic_fee = annual_fee * dt
    means = means - periodic_fee

    # Cholesky decomposition for correlation
    try:
        L = np.linalg.cholesky(corr_sub)
    except np.linalg.LinAlgError:
        # If matrix not positive definite, use nearest PD approximation
        eigvals, eigvecs = np.linalg.eigh(corr_sub)
        eigvals = np.maximum(eigvals, 1e-8)
        corr_sub = eigvecs @ np.diag(eigvals) @ eigvecs.T
        L = np.linalg.cholesky(corr_sub)

    # Generate random samples
    if use_fat_tails:
        # Student-t for fat tails (captures market crashes better)
        # Scale to have unit variance
        scale = np.sqrt((degrees_of_freedom - 2) / degrees_of_freedom) if degrees_of_freedom > 2 else 1.0
        uncorrelated = random_state.standard_t(degrees_of_freedom, (n_simulations, n_periods, n_assets)) * scale
    else:
        # Standard normal
        uncorrelated = random_state.standard_normal((n_simulations, n_periods, n_assets))

    # Apply correlation
    correlated = np.einsum('ijk,lk->ijl', uncorrelated, L)

    # Scale by volatility and add mean
    asset_returns = correlated * stds + means

    # Calculate portfolio returns (weighted sum)
    portfolio_returns = np.einsum('ijk,k->ij', asset_returns, weights)

    return portfolio_returns


def get_portfolio_stats(allocation: Dict[str, float], annual_fee: float = 0.0) -> Tuple[float, float]:
    """
    Calculate expected portfolio return and volatility.

    Returns:
        Tuple of (expected_annual_return, annual_volatility)
    """
    active_assets = [a for a in ASSET_ORDER if allocation.get(a, 0) > 0]

    if not active_assets:
        return 0.0, 0.0

    indices = [ASSET_ORDER.index(a) for a in active_assets]
    corr_sub = CORRELATION_MATRIX[np.ix_(indices, indices)]

    returns = np.array([ASSET_CLASSES[a].expected_return for a in active_assets])
    vols = np.array([ASSET_CLASSES[a].volatility for a in active_assets])
    weights = np.array([allocation[a] for a in active_assets])
    weights = weights / weights.sum()

    # Expected return (weighted average minus fees)
    expected_return = np.dot(weights, returns) - annual_fee

    # Portfolio volatility (using correlation matrix)
    cov_matrix = np.outer(vols, vols) * corr_sub
    portfolio_variance = weights @ cov_matrix @ weights
    portfolio_vol = np.sqrt(portfolio_variance)

    return expected_return, portfolio_vol
