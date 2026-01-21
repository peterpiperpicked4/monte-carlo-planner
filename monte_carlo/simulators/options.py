"""Option pricing Monte Carlo simulator."""
import numpy as np
from typing import Dict, Any, Optional, Tuple
from scipy import stats

from .base import BaseSimulator, SimulationResults
from ..config import SimulationConfig, OptionsConfig
from ..models.returns import GeometricBrownianMotion


class OptionPricingSimulator(BaseSimulator):
    """
    Monte Carlo simulator for option pricing.

    Supports European call and put options, with comparison to
    Black-Scholes analytical solution.
    """

    def __init__(self, config: SimulationConfig):
        super().__init__(config)

        if config.options is None:
            config.options = OptionsConfig()
        self.options_config = config.options

        self.return_model = GeometricBrownianMotion(
            annual_return=self.options_config.risk_free_rate,
            annual_volatility=self.options_config.volatility,
            periods_per_year=252
        )

    @property
    def simulation_type(self) -> str:
        return "options"

    def _run_simulation(self) -> Tuple[np.ndarray, np.ndarray]:
        """Run option pricing simulation."""
        oc = self.options_config
        n_sims = self.config.num_simulations
        n_steps = int(oc.time_to_maturity_years * 252)

        paths = self.return_model.generate_price_paths(
            initial_price=oc.spot_price,
            n_periods=n_steps,
            n_simulations=n_sims,
            random_state=self.random_state
        )

        final_prices = paths[:, -1]

        if oc.option_type.lower() == "call":
            payoffs = np.maximum(final_prices - oc.strike_price, 0)
        else:
            payoffs = np.maximum(oc.strike_price - final_prices, 0)

        discount_factor = np.exp(-oc.risk_free_rate * oc.time_to_maturity_years)
        discounted_payoffs = payoffs * discount_factor

        return discounted_payoffs, paths

    def _black_scholes(self) -> Dict[str, float]:
        """Calculate Black-Scholes analytical price."""
        oc = self.options_config
        S = oc.spot_price
        K = oc.strike_price
        r = oc.risk_free_rate
        sigma = oc.volatility
        T = oc.time_to_maturity_years

        d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)

        if oc.option_type.lower() == "call":
            price = S * stats.norm.cdf(d1) - K * np.exp(-r * T) * stats.norm.cdf(d2)
            delta = stats.norm.cdf(d1)
        else:
            price = K * np.exp(-r * T) * stats.norm.cdf(-d2) - S * stats.norm.cdf(-d1)
            delta = stats.norm.cdf(d1) - 1

        gamma = stats.norm.pdf(d1) / (S * sigma * np.sqrt(T))
        vega = S * stats.norm.pdf(d1) * np.sqrt(T) / 100
        theta = (-(S * stats.norm.pdf(d1) * sigma) / (2 * np.sqrt(T)) -
                 r * K * np.exp(-r * T) * stats.norm.cdf(d2 if oc.option_type.lower() == "call" else -d2)) / 365

        return {
            "price": float(price),
            "delta": float(delta),
            "gamma": float(gamma),
            "vega": float(vega),
            "theta": float(theta),
            "d1": float(d1),
            "d2": float(d2)
        }

    def _calculate_custom_metrics(
        self,
        final_values: np.ndarray,
        all_paths: Optional[np.ndarray]
    ) -> Dict[str, Any]:
        """Calculate option-specific metrics."""
        oc = self.options_config

        mc_price = float(np.mean(final_values))
        mc_std_error = float(np.std(final_values) / np.sqrt(len(final_values)))

        bs_results = self._black_scholes()

        metrics = {
            "option_type": oc.option_type,
            "spot_price": oc.spot_price,
            "strike_price": oc.strike_price,
            "risk_free_rate": oc.risk_free_rate,
            "volatility": oc.volatility,
            "time_to_maturity": oc.time_to_maturity_years,
            "mc_price": mc_price,
            "mc_std_error": mc_std_error,
            "mc_95_ci_lower": mc_price - 1.96 * mc_std_error,
            "mc_95_ci_upper": mc_price + 1.96 * mc_std_error,
            "bs_price": bs_results["price"],
            "price_difference": mc_price - bs_results["price"],
            "price_difference_pct": (mc_price - bs_results["price"]) / bs_results["price"] * 100,
            "bs_delta": bs_results["delta"],
            "bs_gamma": bs_results["gamma"],
            "bs_vega": bs_results["vega"],
            "bs_theta": bs_results["theta"],
            "probability_itm": float(np.mean(final_values > 0)),
            "expected_payoff_if_itm": float(np.mean(final_values[final_values > 0])) if np.any(final_values > 0) else 0,
        }

        if all_paths is not None:
            final_prices = all_paths[:, -1]
            metrics["expected_final_price"] = float(np.mean(final_prices))
            metrics["final_price_std"] = float(np.std(final_prices))
            if oc.option_type.lower() == "call":
                metrics["prob_above_strike"] = float(np.mean(final_prices > oc.strike_price))
            else:
                metrics["prob_below_strike"] = float(np.mean(final_prices < oc.strike_price))

        return metrics

    def price_asian_option(
        self,
        averaging_type: str = "arithmetic"
    ) -> Dict[str, float]:
        """Price an Asian option using Monte Carlo."""
        if self.results is None or self.results.all_paths is None:
            raise ValueError("Run simulation first")

        oc = self.options_config
        paths = self.results.all_paths

        if averaging_type == "arithmetic":
            average_prices = np.mean(paths, axis=1)
        else:
            average_prices = np.exp(np.mean(np.log(paths), axis=1))

        if oc.option_type.lower() == "call":
            payoffs = np.maximum(average_prices - oc.strike_price, 0)
        else:
            payoffs = np.maximum(oc.strike_price - average_prices, 0)

        discount_factor = np.exp(-oc.risk_free_rate * oc.time_to_maturity_years)
        discounted_payoffs = payoffs * discount_factor

        price = float(np.mean(discounted_payoffs))
        std_error = float(np.std(discounted_payoffs) / np.sqrt(len(discounted_payoffs)))

        return {
            "asian_price": price,
            "std_error": std_error,
            "averaging_type": averaging_type,
            "95_ci_lower": price - 1.96 * std_error,
            "95_ci_upper": price + 1.96 * std_error
        }

    def price_barrier_option(
        self,
        barrier: float,
        barrier_type: str = "down-and-out"
    ) -> Dict[str, float]:
        """Price a barrier option using Monte Carlo."""
        if self.results is None or self.results.all_paths is None:
            raise ValueError("Run simulation first")

        oc = self.options_config
        paths = self.results.all_paths
        final_prices = paths[:, -1]

        if barrier_type == "down-and-out":
            knocked_out = np.any(paths <= barrier, axis=1)
        elif barrier_type == "down-and-in":
            knocked_in = np.any(paths <= barrier, axis=1)
            knocked_out = ~knocked_in
        elif barrier_type == "up-and-out":
            knocked_out = np.any(paths >= barrier, axis=1)
        elif barrier_type == "up-and-in":
            knocked_in = np.any(paths >= barrier, axis=1)
            knocked_out = ~knocked_in
        else:
            raise ValueError(f"Unknown barrier type: {barrier_type}")

        if oc.option_type.lower() == "call":
            payoffs = np.maximum(final_prices - oc.strike_price, 0)
        else:
            payoffs = np.maximum(oc.strike_price - final_prices, 0)

        payoffs[knocked_out] = 0

        discount_factor = np.exp(-oc.risk_free_rate * oc.time_to_maturity_years)
        discounted_payoffs = payoffs * discount_factor

        price = float(np.mean(discounted_payoffs))
        std_error = float(np.std(discounted_payoffs) / np.sqrt(len(discounted_payoffs)))

        return {
            "barrier_price": price,
            "std_error": std_error,
            "barrier": barrier,
            "barrier_type": barrier_type,
            "knockout_probability": float(np.mean(knocked_out)),
            "95_ci_lower": price - 1.96 * std_error,
            "95_ci_upper": price + 1.96 * std_error
        }

    def calculate_implied_volatility(
        self,
        market_price: float,
        tolerance: float = 0.0001,
        max_iterations: int = 100
    ) -> float:
        """Calculate implied volatility using Newton-Raphson method."""
        oc = self.options_config
        S = oc.spot_price
        K = oc.strike_price
        r = oc.risk_free_rate
        T = oc.time_to_maturity_years

        sigma = 0.2

        for _ in range(max_iterations):
            d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
            d2 = d1 - sigma * np.sqrt(T)

            if oc.option_type.lower() == "call":
                price = S * stats.norm.cdf(d1) - K * np.exp(-r * T) * stats.norm.cdf(d2)
            else:
                price = K * np.exp(-r * T) * stats.norm.cdf(-d2) - S * stats.norm.cdf(-d1)

            vega = S * stats.norm.pdf(d1) * np.sqrt(T)

            diff = price - market_price

            if abs(diff) < tolerance:
                return float(sigma)

            if vega < 1e-10:
                break

            sigma = sigma - diff / vega

            sigma = max(0.001, min(sigma, 5.0))

        return float(sigma)
