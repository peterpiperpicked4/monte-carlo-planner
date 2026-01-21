"""Return distribution models for Monte Carlo simulations."""

from .returns import (
    ReturnModel,
    GeometricBrownianMotion,
    NormalReturns,
    StudentTReturns,
    HistoricalBootstrap,
    create_return_model
)

__all__ = [
    "ReturnModel",
    "GeometricBrownianMotion",
    "NormalReturns",
    "StudentTReturns",
    "HistoricalBootstrap",
    "create_return_model"
]
