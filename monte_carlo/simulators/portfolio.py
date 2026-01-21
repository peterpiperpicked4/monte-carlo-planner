"""Portfolio projection Monte Carlo simulator."""
import numpy as np
from typing import Dict, Any, Optional, Tuple

from .base import BaseSimulator, SimulationResults
from ..config import SimulationConfig, PortfolioConfig
from ..models.returns import GeometricBrownianMotion
from ..utils.stats import calculate_probability_of_success, calculate_max_drawdown


class PortfolioSimulator(BaseSimulator):
    """
    Monte Carlo simulator for portfolio/investment projections.

    Uses Geometric Brownian Motion to simulate asset returns
    with support for regular contributions.
    """

    def __init__(self, config: SimulationConfig):
        super().__init__(config)

        if config.portfolio is None:
            config.portfolio = PortfolioConfig()
        self.portfolio_config = config.portfolio

        self.return_model = GeometricBrownianMotion(
            annual_return=self.portfolio_config.expected_annual_return,
            annual_volatility=self.portfolio_config.annual_volatility,
            periods_per_year=12
        )

    @property
    def simulation_type(self) -> str:
        return "portfolio"

    def _run_simulation(self) -> Tuple[np.ndarray, np.ndarray]:
        """Run portfolio simulation with monthly contributions."""
        n_months = self.config.time_horizon_years * 12
        n_sims = self.config.num_simulations

        initial_value = self.portfolio_config.initial_value
        monthly_contribution = self.portfolio_config.monthly_contribution

        log_returns = self.return_model.generate_returns(
            n_periods=n_months,
            n_simulations=n_sims,
            random_state=self.random_state
        )

        returns = np.exp(log_returns)

        paths = np.zeros((n_sims, n_months + 1))
        paths[:, 0] = initial_value

        for t in range(n_months):
            paths[:, t + 1] = (paths[:, t] + monthly_contribution) * returns[:, t]

        final_values = paths[:, -1]

        return final_values, paths

    def _calculate_custom_metrics(
        self,
        final_values: np.ndarray,
        all_paths: Optional[np.ndarray]
    ) -> Dict[str, Any]:
        """Calculate portfolio-specific metrics."""
        total_contributions = (
            self.portfolio_config.initial_value +
            self.portfolio_config.monthly_contribution * self.config.time_horizon_years * 12
        )

        metrics = {
            "initial_investment": self.portfolio_config.initial_value,
            "total_contributions": total_contributions,
            "median_final_value": float(np.median(final_values)),
            "expected_final_value": float(np.mean(final_values)),
            "median_gain": float(np.median(final_values) - total_contributions),
            "probability_of_profit": calculate_probability_of_success(
                final_values, total_contributions
            ),
        }

        common_targets = [
            100000, 250000, 500000, 1000000, 2000000, 5000000
        ]
        for target in common_targets:
            if target > total_contributions * 0.5:
                metrics[f"prob_reaching_{target:,}"] = calculate_probability_of_success(
                    final_values, target
                )

        if all_paths is not None:
            median_path = np.median(all_paths, axis=0)
            max_dd, peak_idx, trough_idx = calculate_max_drawdown(median_path)
            metrics["median_path_max_drawdown"] = max_dd

            worst_path_idx = np.argmin(final_values)
            worst_dd, _, _ = calculate_max_drawdown(all_paths[worst_path_idx])
            metrics["worst_case_max_drawdown"] = worst_dd

        growth_multiple = final_values / total_contributions
        metrics["median_growth_multiple"] = float(np.median(growth_multiple))
        metrics["p10_growth_multiple"] = float(np.percentile(growth_multiple, 10))
        metrics["p90_growth_multiple"] = float(np.percentile(growth_multiple, 90))

        return metrics

    def get_annual_snapshots(self) -> Dict[int, Dict[str, float]]:
        """Get statistics at each year end."""
        if self.results is None or self.results.all_paths is None:
            raise ValueError("Run simulation first")

        paths = self.results.all_paths
        snapshots = {}

        for year in range(1, self.config.time_horizon_years + 1):
            month_idx = year * 12
            values = paths[:, month_idx]

            snapshots[year] = {
                "mean": float(np.mean(values)),
                "median": float(np.median(values)),
                "p5": float(np.percentile(values, 5)),
                "p95": float(np.percentile(values, 95)),
                "std": float(np.std(values))
            }

        return snapshots
