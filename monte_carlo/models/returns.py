"""Return distribution models for Monte Carlo simulations."""
import numpy as np
from abc import ABC, abstractmethod
from typing import Optional
from scipy import stats


class ReturnModel(ABC):
    """Abstract base class for return distribution models."""

    @abstractmethod
    def generate_returns(
        self,
        n_periods: int,
        n_simulations: int,
        random_state: Optional[np.random.Generator] = None
    ) -> np.ndarray:
        """Generate random returns matrix (n_simulations x n_periods)."""
        pass

    @abstractmethod
    def generate_price_paths(
        self,
        initial_price: float,
        n_periods: int,
        n_simulations: int,
        random_state: Optional[np.random.Generator] = None
    ) -> np.ndarray:
        """Generate price paths matrix (n_simulations x n_periods+1)."""
        pass


class GeometricBrownianMotion(ReturnModel):
    """
    Geometric Brownian Motion model for asset prices.

    dS = mu * S * dt + sigma * S * dW
    """

    def __init__(
        self,
        annual_return: float = 0.07,
        annual_volatility: float = 0.15,
        periods_per_year: int = 12
    ):
        self.annual_return = annual_return
        self.annual_volatility = annual_volatility
        self.periods_per_year = periods_per_year

        self.dt = 1.0 / periods_per_year
        self.mu = annual_return
        self.sigma = annual_volatility

    def generate_returns(
        self,
        n_periods: int,
        n_simulations: int,
        random_state: Optional[np.random.Generator] = None
    ) -> np.ndarray:
        """Generate log returns using GBM."""
        if random_state is None:
            random_state = np.random.default_rng()

        drift = (self.mu - 0.5 * self.sigma ** 2) * self.dt
        diffusion = self.sigma * np.sqrt(self.dt)

        Z = random_state.standard_normal((n_simulations, n_periods))
        log_returns = drift + diffusion * Z

        return log_returns

    def generate_price_paths(
        self,
        initial_price: float,
        n_periods: int,
        n_simulations: int,
        random_state: Optional[np.random.Generator] = None
    ) -> np.ndarray:
        """Generate price paths using GBM."""
        log_returns = self.generate_returns(n_periods, n_simulations, random_state)

        log_prices = np.zeros((n_simulations, n_periods + 1))
        log_prices[:, 0] = np.log(initial_price)
        log_prices[:, 1:] = np.log(initial_price) + np.cumsum(log_returns, axis=1)

        return np.exp(log_prices)


class NormalReturns(ReturnModel):
    """Simple normal distribution model for returns."""

    def __init__(
        self,
        annual_return: float = 0.07,
        annual_volatility: float = 0.15,
        periods_per_year: int = 12
    ):
        self.annual_return = annual_return
        self.annual_volatility = annual_volatility
        self.periods_per_year = periods_per_year

        self.periodic_return = annual_return / periods_per_year
        self.periodic_volatility = annual_volatility / np.sqrt(periods_per_year)

    def generate_returns(
        self,
        n_periods: int,
        n_simulations: int,
        random_state: Optional[np.random.Generator] = None
    ) -> np.ndarray:
        """Generate normally distributed returns."""
        if random_state is None:
            random_state = np.random.default_rng()

        returns = random_state.normal(
            self.periodic_return,
            self.periodic_volatility,
            (n_simulations, n_periods)
        )
        return returns

    def generate_price_paths(
        self,
        initial_price: float,
        n_periods: int,
        n_simulations: int,
        random_state: Optional[np.random.Generator] = None
    ) -> np.ndarray:
        """Generate price paths from normal returns."""
        returns = self.generate_returns(n_periods, n_simulations, random_state)

        prices = np.zeros((n_simulations, n_periods + 1))
        prices[:, 0] = initial_price

        for t in range(n_periods):
            prices[:, t + 1] = prices[:, t] * (1 + returns[:, t])

        return prices


class StudentTReturns(ReturnModel):
    """
    Student-t distribution model for returns with fat tails.
    Better captures extreme events than normal distribution.
    """

    def __init__(
        self,
        annual_return: float = 0.07,
        annual_volatility: float = 0.15,
        degrees_of_freedom: float = 5.0,
        periods_per_year: int = 12
    ):
        self.annual_return = annual_return
        self.annual_volatility = annual_volatility
        self.df = degrees_of_freedom
        self.periods_per_year = periods_per_year

        self.periodic_return = annual_return / periods_per_year
        self.periodic_volatility = annual_volatility / np.sqrt(periods_per_year)

        if self.df > 2:
            self.scale = self.periodic_volatility * np.sqrt((self.df - 2) / self.df)
        else:
            self.scale = self.periodic_volatility

    def generate_returns(
        self,
        n_periods: int,
        n_simulations: int,
        random_state: Optional[np.random.Generator] = None
    ) -> np.ndarray:
        """Generate Student-t distributed returns."""
        if random_state is None:
            random_state = np.random.default_rng()

        t_samples = random_state.standard_t(self.df, (n_simulations, n_periods))
        returns = self.periodic_return + self.scale * t_samples

        return returns

    def generate_price_paths(
        self,
        initial_price: float,
        n_periods: int,
        n_simulations: int,
        random_state: Optional[np.random.Generator] = None
    ) -> np.ndarray:
        """Generate price paths from Student-t returns."""
        returns = self.generate_returns(n_periods, n_simulations, random_state)

        prices = np.zeros((n_simulations, n_periods + 1))
        prices[:, 0] = initial_price

        for t in range(n_periods):
            prices[:, t + 1] = prices[:, t] * (1 + returns[:, t])

        prices = np.maximum(prices, 0)

        return prices


class HistoricalBootstrap(ReturnModel):
    """Bootstrap returns from historical data."""

    def __init__(
        self,
        historical_returns: np.ndarray,
        block_size: int = 1
    ):
        self.historical_returns = np.asarray(historical_returns).flatten()
        self.block_size = block_size

    def generate_returns(
        self,
        n_periods: int,
        n_simulations: int,
        random_state: Optional[np.random.Generator] = None
    ) -> np.ndarray:
        """Generate returns by bootstrap sampling from historical data."""
        if random_state is None:
            random_state = np.random.default_rng()

        if self.block_size == 1:
            indices = random_state.integers(
                0, len(self.historical_returns),
                (n_simulations, n_periods)
            )
            returns = self.historical_returns[indices]
        else:
            n_blocks = (n_periods + self.block_size - 1) // self.block_size
            returns = np.zeros((n_simulations, n_periods))

            max_start = len(self.historical_returns) - self.block_size
            if max_start < 0:
                max_start = 0

            for sim in range(n_simulations):
                idx = 0
                for _ in range(n_blocks):
                    start = random_state.integers(0, max_start + 1)
                    block = self.historical_returns[start:start + self.block_size]
                    end_idx = min(idx + len(block), n_periods)
                    returns[sim, idx:end_idx] = block[:end_idx - idx]
                    idx = end_idx

        return returns

    def generate_price_paths(
        self,
        initial_price: float,
        n_periods: int,
        n_simulations: int,
        random_state: Optional[np.random.Generator] = None
    ) -> np.ndarray:
        """Generate price paths from bootstrapped returns."""
        returns = self.generate_returns(n_periods, n_simulations, random_state)

        prices = np.zeros((n_simulations, n_periods + 1))
        prices[:, 0] = initial_price

        for t in range(n_periods):
            prices[:, t + 1] = prices[:, t] * (1 + returns[:, t])

        return np.maximum(prices, 0)


def create_return_model(
    model_type: str = "gbm",
    annual_return: float = 0.07,
    annual_volatility: float = 0.15,
    periods_per_year: int = 12,
    **kwargs
) -> ReturnModel:
    """Factory function to create return models."""
    models = {
        "gbm": GeometricBrownianMotion,
        "normal": NormalReturns,
        "student_t": StudentTReturns,
        "bootstrap": HistoricalBootstrap
    }

    model_type = model_type.lower()
    if model_type not in models:
        raise ValueError(f"Unknown model type: {model_type}. Available: {list(models.keys())}")

    if model_type == "bootstrap":
        if "historical_returns" not in kwargs:
            raise ValueError("HistoricalBootstrap requires 'historical_returns' parameter")
        return HistoricalBootstrap(
            historical_returns=kwargs["historical_returns"],
            block_size=kwargs.get("block_size", 1)
        )

    return models[model_type](
        annual_return=annual_return,
        annual_volatility=annual_volatility,
        periods_per_year=periods_per_year,
        **{k: v for k, v in kwargs.items() if k in ["degrees_of_freedom"]}
    )
