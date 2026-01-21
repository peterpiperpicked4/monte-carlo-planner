"""
Monte Carlo Financial Simulation Suite

A comprehensive Python package for Monte Carlo simulations in finance,
supporting portfolio projection, retirement planning, VaR analysis, and option pricing.
"""

__version__ = "1.0.0"
__author__ = "Monte Carlo Suite"

from .config import (
    SimulationConfig,
    PortfolioConfig,
    RetirementConfig,
    VaRConfig,
    OptionsConfig
)

from .simulators.base import BaseSimulator, SimulationResults
from .simulators.portfolio import PortfolioSimulator
from .simulators.retirement import RetirementSimulator
from .simulators.var import VaRSimulator
from .simulators.options import OptionPricingSimulator

__all__ = [
    "SimulationConfig",
    "PortfolioConfig",
    "RetirementConfig",
    "VaRConfig",
    "OptionsConfig",
    "BaseSimulator",
    "SimulationResults",
    "PortfolioSimulator",
    "RetirementSimulator",
    "VaRSimulator",
    "OptionPricingSimulator"
]
