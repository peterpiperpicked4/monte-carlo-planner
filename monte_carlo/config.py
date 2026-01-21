"""Configuration and data classes for Monte Carlo simulations."""
from dataclasses import dataclass, field
from typing import Optional, List, Union
from pathlib import Path
import yaml
import json


@dataclass
class PortfolioConfig:
    """Configuration for portfolio simulation."""
    initial_value: float = 100000
    monthly_contribution: float = 1000
    expected_annual_return: float = 0.07
    annual_volatility: float = 0.15


@dataclass
class RetirementConfig:
    """Configuration for retirement simulation."""
    current_savings: float = 500000
    retirement_age: int = 65
    current_age: int = 35
    monthly_contribution: float = 2000
    withdrawal_rate: float = 0.04
    inflation_rate: float = 0.025
    expected_annual_return: float = 0.07
    annual_volatility: float = 0.15


@dataclass
class VaRConfig:
    """Configuration for Value at Risk simulation."""
    portfolio_value: float = 1000000
    confidence_levels: List[float] = field(default_factory=lambda: [0.95, 0.99])
    holding_period_days: int = 10
    historical_returns: Optional[Union[str, List[float]]] = None
    expected_annual_return: float = 0.07
    annual_volatility: float = 0.15


@dataclass
class OptionsConfig:
    """Configuration for option pricing simulation."""
    option_type: str = "call"
    spot_price: float = 100
    strike_price: float = 105
    risk_free_rate: float = 0.05
    volatility: float = 0.20
    time_to_maturity_years: float = 1.0


@dataclass
class SimulationConfig:
    """Main configuration for all simulation types."""
    simulation_type: str = "portfolio"
    num_simulations: int = 10000
    time_horizon_years: int = 30
    random_seed: Optional[int] = None
    output_dir: str = "./output"

    portfolio: Optional[PortfolioConfig] = None
    retirement: Optional[RetirementConfig] = None
    var: Optional[VaRConfig] = None
    options: Optional[OptionsConfig] = None

    @classmethod
    def from_file(cls, filepath: Union[str, Path]) -> "SimulationConfig":
        """Load configuration from YAML or JSON file."""
        filepath = Path(filepath)

        with open(filepath, 'r') as f:
            if filepath.suffix in ['.yaml', '.yml']:
                data = yaml.safe_load(f)
            elif filepath.suffix == '.json':
                data = json.load(f)
            else:
                raise ValueError(f"Unsupported config file format: {filepath.suffix}")

        return cls.from_dict(data)

    @classmethod
    def from_dict(cls, data: dict) -> "SimulationConfig":
        """Create configuration from dictionary."""
        config = cls(
            simulation_type=data.get('simulation_type', 'portfolio'),
            num_simulations=data.get('num_simulations', 10000),
            time_horizon_years=data.get('time_horizon_years', 30),
            random_seed=data.get('random_seed'),
            output_dir=data.get('output_dir', './output')
        )

        if 'portfolio' in data:
            config.portfolio = PortfolioConfig(**data['portfolio'])

        if 'retirement' in data:
            config.retirement = RetirementConfig(**data['retirement'])

        if 'var' in data:
            config.var = VaRConfig(**data['var'])

        if 'options' in data:
            config.options = OptionsConfig(**data['options'])

        return config

    def to_dict(self) -> dict:
        """Convert configuration to dictionary."""
        result = {
            'simulation_type': self.simulation_type,
            'num_simulations': self.num_simulations,
            'time_horizon_years': self.time_horizon_years,
            'random_seed': self.random_seed,
            'output_dir': self.output_dir
        }

        if self.portfolio:
            result['portfolio'] = {
                'initial_value': self.portfolio.initial_value,
                'monthly_contribution': self.portfolio.monthly_contribution,
                'expected_annual_return': self.portfolio.expected_annual_return,
                'annual_volatility': self.portfolio.annual_volatility
            }

        if self.retirement:
            result['retirement'] = {
                'current_savings': self.retirement.current_savings,
                'retirement_age': self.retirement.retirement_age,
                'current_age': self.retirement.current_age,
                'monthly_contribution': self.retirement.monthly_contribution,
                'withdrawal_rate': self.retirement.withdrawal_rate,
                'inflation_rate': self.retirement.inflation_rate,
                'expected_annual_return': self.retirement.expected_annual_return,
                'annual_volatility': self.retirement.annual_volatility
            }

        if self.var:
            result['var'] = {
                'portfolio_value': self.var.portfolio_value,
                'confidence_levels': self.var.confidence_levels,
                'holding_period_days': self.var.holding_period_days,
                'historical_returns': self.var.historical_returns,
                'expected_annual_return': self.var.expected_annual_return,
                'annual_volatility': self.var.annual_volatility
            }

        if self.options:
            result['options'] = {
                'option_type': self.options.option_type,
                'spot_price': self.options.spot_price,
                'strike_price': self.options.strike_price,
                'risk_free_rate': self.options.risk_free_rate,
                'volatility': self.options.volatility,
                'time_to_maturity_years': self.options.time_to_maturity_years
            }

        return result
