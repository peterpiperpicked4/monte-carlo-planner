"""Value at Risk (VaR) Monte Carlo simulator."""
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, Tuple, Union, List
from pathlib import Path

from .base import BaseSimulator, SimulationResults
from ..config import SimulationConfig, VaRConfig
from ..models.returns import GeometricBrownianMotion, HistoricalBootstrap
from ..utils.stats import calculate_var, calculate_cvar


class VaRSimulator(BaseSimulator):
    """
    Monte Carlo simulator for Value at Risk (VaR) analysis.

    Supports both parametric (GBM) and historical simulation methods.
    Calculates VaR and CVaR (Expected Shortfall) at multiple confidence levels.
    """

    def __init__(self, config: SimulationConfig):
        super().__init__(config)

        if config.var is None:
            config.var = VaRConfig()
        self.var_config = config.var

        self.historical_returns = self._load_historical_returns()

        if self.historical_returns is not None:
            self.return_model = HistoricalBootstrap(
                historical_returns=self.historical_returns,
                block_size=1
            )
            self.method = "historical"
        else:
            daily_return = self.var_config.expected_annual_return / 252
            daily_vol = self.var_config.annual_volatility / np.sqrt(252)

            self.return_model = GeometricBrownianMotion(
                annual_return=self.var_config.expected_annual_return,
                annual_volatility=self.var_config.annual_volatility,
                periods_per_year=252
            )
            self.method = "parametric"

    def _load_historical_returns(self) -> Optional[np.ndarray]:
        """Load historical returns from file or config."""
        hr = self.var_config.historical_returns

        if hr is None:
            return None

        if isinstance(hr, list):
            return np.array(hr)

        if isinstance(hr, str):
            filepath = Path(hr)
            if filepath.exists():
                try:
                    df = pd.read_csv(filepath)
                    if 'returns' in df.columns:
                        return df['returns'].values
                    elif 'return' in df.columns:
                        return df['return'].values
                    else:
                        return df.iloc[:, 0].values
                except Exception:
                    return None

        return None

    @property
    def simulation_type(self) -> str:
        return "var"

    def _run_simulation(self) -> Tuple[np.ndarray, np.ndarray]:
        """Run VaR simulation over holding period."""
        n_days = self.var_config.holding_period_days
        n_sims = self.config.num_simulations
        portfolio_value = self.var_config.portfolio_value

        if self.method == "historical" and self.historical_returns is not None:
            returns = self.return_model.generate_returns(
                n_periods=n_days,
                n_simulations=n_sims,
                random_state=self.random_state
            )
        else:
            log_returns = self.return_model.generate_returns(
                n_periods=n_days,
                n_simulations=n_sims,
                random_state=self.random_state
            )
            returns = np.exp(log_returns) - 1

        cumulative_returns = np.prod(1 + returns, axis=1) - 1

        final_values = portfolio_value * (1 + cumulative_returns)
        pnl = final_values - portfolio_value

        paths = np.zeros((n_sims, n_days + 1))
        paths[:, 0] = portfolio_value
        for t in range(n_days):
            paths[:, t + 1] = paths[:, t] * (1 + returns[:, t])

        return pnl, paths

    def _calculate_custom_metrics(
        self,
        final_values: np.ndarray,
        all_paths: Optional[np.ndarray]
    ) -> Dict[str, Any]:
        """Calculate VaR-specific metrics."""
        pnl = final_values
        portfolio_value = self.var_config.portfolio_value

        pnl_returns = pnl / portfolio_value

        metrics = {
            "portfolio_value": portfolio_value,
            "holding_period_days": self.var_config.holding_period_days,
            "simulation_method": self.method,
            "mean_pnl": float(np.mean(pnl)),
            "median_pnl": float(np.median(pnl)),
            "std_pnl": float(np.std(pnl)),
            "min_pnl": float(np.min(pnl)),
            "max_pnl": float(np.max(pnl)),
        }

        for conf in self.var_config.confidence_levels:
            var_abs = calculate_var(pnl_returns, conf, portfolio_value)
            cvar_abs = calculate_cvar(pnl_returns, conf, portfolio_value)
            var_pct = calculate_var(pnl_returns, conf, 1.0)

            metrics[f"var_{int(conf*100)}"] = abs(var_abs)
            metrics[f"var_{int(conf*100)}_pct"] = abs(var_pct)
            metrics[f"cvar_{int(conf*100)}"] = abs(cvar_abs)
            metrics[f"cvar_{int(conf*100)}_pct"] = abs(cvar_abs / portfolio_value)

        metrics["probability_of_loss"] = float(np.mean(pnl < 0))
        metrics["probability_of_gain"] = float(np.mean(pnl > 0))

        loss_pnl = pnl[pnl < 0]
        if len(loss_pnl) > 0:
            metrics["average_loss"] = float(np.mean(loss_pnl))
            metrics["worst_loss"] = float(np.min(loss_pnl))

        gain_pnl = pnl[pnl > 0]
        if len(gain_pnl) > 0:
            metrics["average_gain"] = float(np.mean(gain_pnl))
            metrics["best_gain"] = float(np.max(gain_pnl))

        return metrics

    def calculate_var_at_level(self, confidence_level: float) -> Dict[str, float]:
        """Calculate VaR at a specific confidence level."""
        if self.results is None:
            raise ValueError("Run simulation first")

        pnl = self.results.final_values
        portfolio_value = self.var_config.portfolio_value
        pnl_returns = pnl / portfolio_value

        var_abs = calculate_var(pnl_returns, confidence_level, portfolio_value)
        cvar_abs = calculate_cvar(pnl_returns, confidence_level, portfolio_value)

        return {
            "confidence_level": confidence_level,
            "var_absolute": abs(var_abs),
            "var_percentage": abs(var_abs / portfolio_value),
            "cvar_absolute": abs(cvar_abs),
            "cvar_percentage": abs(cvar_abs / portfolio_value)
        }

    def stress_test(
        self,
        stress_factor: float = 2.0
    ) -> Dict[str, Any]:
        """Run stress test with increased volatility."""
        original_vol = self.var_config.annual_volatility
        stressed_vol = original_vol * stress_factor

        stressed_model = GeometricBrownianMotion(
            annual_return=self.var_config.expected_annual_return,
            annual_volatility=stressed_vol,
            periods_per_year=252
        )

        n_days = self.var_config.holding_period_days
        n_sims = self.config.num_simulations
        portfolio_value = self.var_config.portfolio_value

        log_returns = stressed_model.generate_returns(
            n_periods=n_days,
            n_simulations=n_sims,
            random_state=np.random.default_rng(self.config.random_seed)
        )
        returns = np.exp(log_returns) - 1

        cumulative_returns = np.prod(1 + returns, axis=1) - 1
        pnl = portfolio_value * cumulative_returns
        pnl_returns = pnl / portfolio_value

        results = {
            "stress_factor": stress_factor,
            "original_volatility": original_vol,
            "stressed_volatility": stressed_vol,
        }

        for conf in self.var_config.confidence_levels:
            var_abs = calculate_var(pnl_returns, conf, portfolio_value)
            results[f"stressed_var_{int(conf*100)}"] = abs(var_abs)

        return results

    def get_loss_distribution(self, bins: int = 50) -> Tuple[np.ndarray, np.ndarray]:
        """Get histogram data for loss distribution."""
        if self.results is None:
            raise ValueError("Run simulation first")

        pnl = self.results.final_values
        hist, edges = np.histogram(pnl, bins=bins)

        return hist, edges
