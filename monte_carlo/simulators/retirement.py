"""Retirement planning Monte Carlo simulator."""
import numpy as np
from typing import Dict, Any, Optional, Tuple

from .base import BaseSimulator, SimulationResults
from ..config import SimulationConfig, RetirementConfig
from ..models.returns import GeometricBrownianMotion
from ..utils.stats import calculate_safe_withdrawal_rate


class RetirementSimulator(BaseSimulator):
    """
    Monte Carlo simulator for retirement planning.

    Simulates two phases:
    1. Accumulation: Regular contributions until retirement
    2. Distribution: Withdrawals adjusted for inflation
    """

    def __init__(self, config: SimulationConfig):
        super().__init__(config)

        if config.retirement is None:
            config.retirement = RetirementConfig()
        self.retirement_config = config.retirement

        self.return_model = GeometricBrownianMotion(
            annual_return=self.retirement_config.expected_annual_return,
            annual_volatility=self.retirement_config.annual_volatility,
            periods_per_year=12
        )

    @property
    def simulation_type(self) -> str:
        return "retirement"

    def _run_simulation(self) -> Tuple[np.ndarray, np.ndarray]:
        """Run retirement simulation with accumulation and distribution phases."""
        rc = self.retirement_config
        n_sims = self.config.num_simulations

        years_to_retirement = rc.retirement_age - rc.current_age
        years_in_retirement = self.config.time_horizon_years - years_to_retirement

        if years_to_retirement < 0:
            years_to_retirement = 0
        if years_in_retirement < 0:
            years_in_retirement = self.config.time_horizon_years

        total_months = self.config.time_horizon_years * 12
        accumulation_months = years_to_retirement * 12
        distribution_months = years_in_retirement * 12

        log_returns = self.return_model.generate_returns(
            n_periods=total_months,
            n_simulations=n_sims,
            random_state=self.random_state
        )
        returns = np.exp(log_returns)

        paths = np.zeros((n_sims, total_months + 1))
        paths[:, 0] = rc.current_savings

        for t in range(accumulation_months):
            paths[:, t + 1] = (paths[:, t] + rc.monthly_contribution) * returns[:, t]

        if accumulation_months > 0:
            retirement_value = paths[:, accumulation_months]
        else:
            retirement_value = paths[:, 0]

        initial_annual_withdrawal = retirement_value * rc.withdrawal_rate
        monthly_withdrawal = initial_annual_withdrawal / 12

        for t in range(accumulation_months, total_months):
            months_into_retirement = t - accumulation_months
            years_into_retirement = months_into_retirement / 12
            inflation_factor = (1 + rc.inflation_rate) ** years_into_retirement

            current_withdrawal = monthly_withdrawal * inflation_factor

            pre_withdrawal = paths[:, t] * returns[:, t]
            paths[:, t + 1] = np.maximum(pre_withdrawal - current_withdrawal, 0)

        final_values = paths[:, -1]

        return final_values, paths

    def _calculate_custom_metrics(
        self,
        final_values: np.ndarray,
        all_paths: Optional[np.ndarray]
    ) -> Dict[str, Any]:
        """Calculate retirement-specific metrics."""
        rc = self.retirement_config
        years_to_retirement = rc.retirement_age - rc.current_age
        accumulation_months = max(0, years_to_retirement * 12)

        success_rate = float(np.mean(final_values > 0))

        if all_paths is not None and accumulation_months > 0:
            retirement_values = all_paths[:, accumulation_months]
        else:
            retirement_values = all_paths[:, 0] if all_paths is not None else final_values

        metrics = {
            "years_to_retirement": years_to_retirement,
            "years_in_retirement": self.config.time_horizon_years - years_to_retirement,
            "initial_savings": rc.current_savings,
            "withdrawal_rate": rc.withdrawal_rate,
            "inflation_rate": rc.inflation_rate,
            "probability_of_success": success_rate,
            "probability_of_ruin": 1 - success_rate,
            "median_retirement_value": float(np.median(retirement_values)),
            "p10_retirement_value": float(np.percentile(retirement_values, 10)),
            "p90_retirement_value": float(np.percentile(retirement_values, 90)),
            "median_final_value": float(np.median(final_values)),
            "p10_final_value": float(np.percentile(final_values, 10)),
            "p90_final_value": float(np.percentile(final_values, 90)),
        }

        if all_paths is not None:
            ruin_mask = final_values <= 0
            if np.any(ruin_mask):
                ruin_paths = all_paths[ruin_mask]
                ruin_months = []
                for path in ruin_paths:
                    ruin_idx = np.where(path <= 0)[0]
                    if len(ruin_idx) > 0:
                        ruin_months.append(ruin_idx[0])
                if ruin_months:
                    metrics["median_ruin_month"] = float(np.median(ruin_months))
                    metrics["median_ruin_year"] = float(np.median(ruin_months) / 12)

        safe_wr = calculate_safe_withdrawal_rate(
            retirement_values,
            rc.current_savings,
            target_success_rate=0.95
        )
        metrics["estimated_safe_withdrawal_rate_95"] = safe_wr

        return metrics

    def analyze_withdrawal_rates(
        self,
        rates: list = [0.03, 0.035, 0.04, 0.045, 0.05, 0.055, 0.06]
    ) -> Dict[float, float]:
        """Analyze success probability for different withdrawal rates."""
        if self.results is None or self.results.all_paths is None:
            raise ValueError("Run simulation first")

        rc = self.retirement_config
        years_to_retirement = rc.retirement_age - rc.current_age
        accumulation_months = max(0, years_to_retirement * 12)
        distribution_months = self.config.time_horizon_years * 12 - accumulation_months

        if accumulation_months > 0:
            retirement_values = self.results.all_paths[:, accumulation_months]
        else:
            retirement_values = self.results.all_paths[:, 0]

        post_retirement_returns = np.exp(
            self.return_model.generate_returns(
                n_periods=distribution_months,
                n_simulations=self.config.num_simulations,
                random_state=np.random.default_rng(self.config.random_seed)
            )
        )

        results = {}

        for rate in rates:
            values = retirement_values.copy()
            monthly_withdrawal = values * rate / 12

            for t in range(distribution_months):
                years_into_retirement = t / 12
                inflation_factor = (1 + rc.inflation_rate) ** years_into_retirement
                current_withdrawal = monthly_withdrawal * inflation_factor

                values = values * post_retirement_returns[:, t]
                values = np.maximum(values - current_withdrawal, 0)

            success_rate = float(np.mean(values > 0))
            results[rate] = success_rate

        return results

    def get_phase_summary(self) -> Dict[str, Dict[str, float]]:
        """Get summary statistics for accumulation and distribution phases."""
        if self.results is None or self.results.all_paths is None:
            raise ValueError("Run simulation first")

        rc = self.retirement_config
        years_to_retirement = rc.retirement_age - rc.current_age
        accumulation_months = max(0, years_to_retirement * 12)

        paths = self.results.all_paths

        summary = {
            "start": {
                "mean": float(np.mean(paths[:, 0])),
                "median": float(np.median(paths[:, 0]))
            }
        }

        if accumulation_months > 0:
            retirement_values = paths[:, accumulation_months]
            summary["retirement"] = {
                "mean": float(np.mean(retirement_values)),
                "median": float(np.median(retirement_values)),
                "p10": float(np.percentile(retirement_values, 10)),
                "p90": float(np.percentile(retirement_values, 90))
            }

        final_values = paths[:, -1]
        summary["end"] = {
            "mean": float(np.mean(final_values)),
            "median": float(np.median(final_values)),
            "p10": float(np.percentile(final_values, 10)),
            "p90": float(np.percentile(final_values, 90))
        }

        return summary
