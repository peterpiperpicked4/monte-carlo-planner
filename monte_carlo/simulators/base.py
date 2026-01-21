"""Abstract base class for Monte Carlo simulators."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
import numpy as np
import json
from pathlib import Path

from ..config import SimulationConfig
from ..utils.stats import calculate_statistics, calculate_percentiles


@dataclass
class SimulationResults:
    """Container for simulation results."""
    simulation_type: str
    num_simulations: int
    time_horizon_years: int

    final_values: np.ndarray = field(repr=False)
    all_paths: Optional[np.ndarray] = field(default=None, repr=False)

    statistics: Dict[str, float] = field(default_factory=dict)
    percentiles: Dict[str, float] = field(default_factory=dict)
    custom_metrics: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert results to dictionary for JSON export."""
        return {
            "simulation_type": self.simulation_type,
            "num_simulations": self.num_simulations,
            "time_horizon_years": self.time_horizon_years,
            "statistics": self.statistics,
            "percentiles": self.percentiles,
            "custom_metrics": self.custom_metrics
        }

    def save_json(self, filepath: Path) -> None:
        """Save results to JSON file."""
        with open(filepath, 'w') as f:
            json.dump(self.to_dict(), f, indent=2, default=str)

    def summary(self) -> str:
        """Generate text summary of results."""
        lines = [
            f"\n{'='*60}",
            f" {self.simulation_type.upper()} SIMULATION RESULTS",
            f"{'='*60}",
            f" Simulations: {self.num_simulations:,}",
            f" Time Horizon: {self.time_horizon_years} years",
            f"{'='*60}",
            "\n STATISTICS:",
        ]

        for key, value in self.statistics.items():
            if isinstance(value, float):
                if abs(value) >= 1000:
                    lines.append(f"   {key}: ${value:,.2f}")
                else:
                    lines.append(f"   {key}: {value:.4f}")
            else:
                lines.append(f"   {key}: {value}")

        lines.append("\n PERCENTILES:")
        for key, value in sorted(self.percentiles.items()):
            if isinstance(value, float) and abs(value) >= 1000:
                lines.append(f"   {key}: ${value:,.2f}")
            else:
                lines.append(f"   {key}: {value:.4f}")

        if self.custom_metrics:
            lines.append("\n CUSTOM METRICS:")
            for key, value in self.custom_metrics.items():
                if isinstance(value, float):
                    if abs(value) >= 1000:
                        lines.append(f"   {key}: ${value:,.2f}")
                    elif abs(value) < 1:
                        lines.append(f"   {key}: {value:.2%}")
                    else:
                        lines.append(f"   {key}: {value:.4f}")
                else:
                    lines.append(f"   {key}: {value}")

        lines.append(f"\n{'='*60}\n")
        return "\n".join(lines)


class BaseSimulator(ABC):
    """Abstract base class for all Monte Carlo simulators."""

    def __init__(self, config: SimulationConfig):
        self.config = config
        self.random_state = np.random.default_rng(config.random_seed)
        self.results: Optional[SimulationResults] = None

    @property
    @abstractmethod
    def simulation_type(self) -> str:
        """Return the type of simulation."""
        pass

    @abstractmethod
    def _run_simulation(self) -> tuple:
        """
        Run the core simulation logic.

        Returns:
            Tuple of (final_values, all_paths) where all_paths can be None
        """
        pass

    @abstractmethod
    def _calculate_custom_metrics(self, final_values: np.ndarray, all_paths: Optional[np.ndarray]) -> Dict[str, Any]:
        """Calculate simulation-specific metrics."""
        pass

    def run(self) -> SimulationResults:
        """Run the full simulation and return results."""
        final_values, all_paths = self._run_simulation()

        statistics = calculate_statistics(final_values)
        percentiles = calculate_percentiles(final_values)
        custom_metrics = self._calculate_custom_metrics(final_values, all_paths)

        self.results = SimulationResults(
            simulation_type=self.simulation_type,
            num_simulations=self.config.num_simulations,
            time_horizon_years=self.config.time_horizon_years,
            final_values=final_values,
            all_paths=all_paths,
            statistics=statistics,
            percentiles=percentiles,
            custom_metrics=custom_metrics
        )

        return self.results

    def get_percentile_paths(self, percentiles: List[float] = [5, 25, 50, 75, 95]) -> Dict[int, np.ndarray]:
        """Get paths at specified percentiles for visualization."""
        if self.results is None or self.results.all_paths is None:
            raise ValueError("Run simulation first and ensure paths are saved")

        paths = self.results.all_paths
        result = {}

        for p in percentiles:
            percentile_values = np.percentile(paths, p, axis=0)
            result[p] = percentile_values

        return result

    def print_summary(self) -> None:
        """Print summary of results to console."""
        if self.results is None:
            raise ValueError("Run simulation first")
        print(self.results.summary())

    def save_results(self, output_dir: Optional[str] = None) -> Path:
        """Save results to JSON file."""
        if self.results is None:
            raise ValueError("Run simulation first")

        output_dir = Path(output_dir or self.config.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        filepath = output_dir / f"{self.simulation_type}_results.json"
        self.results.save_json(filepath)

        return filepath
