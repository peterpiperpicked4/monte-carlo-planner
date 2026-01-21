"""CLI entry point for Monte Carlo Financial Simulation Suite."""
import argparse
import sys
from pathlib import Path

from .config import SimulationConfig
from .simulators.portfolio import PortfolioSimulator
from .simulators.retirement import RetirementSimulator
from .simulators.var import VaRSimulator
from .simulators.options import OptionPricingSimulator
from .visualization.charts import (
    plot_fan_chart,
    plot_distribution,
    plot_var_analysis,
    plot_option_analysis,
    plot_retirement_analysis,
    plot_summary_dashboard,
    save_all_charts
)


SIMULATORS = {
    "portfolio": PortfolioSimulator,
    "retirement": RetirementSimulator,
    "var": VaRSimulator,
    "options": OptionPricingSimulator
}


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Monte Carlo Financial Simulation Suite",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m monte_carlo --config config.yaml
  python -m monte_carlo --config config.json --output ./results
  python -m monte_carlo --config config.yaml --no-charts
        """
    )

    parser.add_argument(
        "--config", "-c",
        type=str,
        required=True,
        help="Path to configuration file (YAML or JSON)"
    )

    parser.add_argument(
        "--output", "-o",
        type=str,
        default="./output",
        help="Output directory for results and charts (default: ./output)"
    )

    parser.add_argument(
        "--no-charts",
        action="store_true",
        help="Skip chart generation"
    )

    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Suppress console output"
    )

    parser.add_argument(
        "--seed",
        type=int,
        help="Random seed (overrides config file)"
    )

    return parser.parse_args()


def run_simulation(config: SimulationConfig, quiet: bool = False):
    """Run the appropriate simulation based on config."""
    sim_type = config.simulation_type.lower()

    if sim_type not in SIMULATORS:
        raise ValueError(f"Unknown simulation type: {sim_type}. Available: {list(SIMULATORS.keys())}")

    simulator_class = SIMULATORS[sim_type]
    simulator = simulator_class(config)

    if not quiet:
        print(f"\nRunning {sim_type} simulation...")
        print(f"  Simulations: {config.num_simulations:,}")
        print(f"  Time horizon: {config.time_horizon_years} years")
        if config.random_seed:
            print(f"  Random seed: {config.random_seed}")

    results = simulator.run()

    return simulator, results


def generate_charts(
    simulator,
    results,
    output_dir: Path,
    quiet: bool = False
):
    """Generate visualization charts based on simulation type."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    sim_type = results.simulation_type
    paths = results.all_paths

    if not quiet:
        print(f"\nGenerating charts...")

    saved_files = save_all_charts(results, paths, output_dir, sim_type)

    if sim_type == "var" and paths is not None:
        var_config = simulator.var_config
        var_levels = {}
        for conf in var_config.confidence_levels:
            key = f"var_{int(conf*100)}"
            if key in results.custom_metrics:
                var_levels[conf] = results.custom_metrics[key]

        if var_levels:
            var_path = output_dir / f"{sim_type}_var_analysis.png"
            plot_var_analysis(
                results.final_values,
                var_levels,
                var_config.portfolio_value,
                save_path=var_path
            )
            saved_files.append(var_path)
            plt.close()

    elif sim_type == "options" and paths is not None:
        opt_config = simulator.options_config
        opt_path = output_dir / f"{sim_type}_option_analysis.png"
        plot_option_analysis(
            paths,
            opt_config.strike_price,
            opt_config.option_type,
            results.custom_metrics.get("mc_price", 0),
            results.custom_metrics.get("bs_price", 0),
            save_path=opt_path
        )
        saved_files.append(opt_path)
        plt.close()

    elif sim_type == "retirement" and paths is not None:
        ret_config = simulator.retirement_config
        years_to_ret = ret_config.retirement_age - ret_config.current_age
        retirement_month = max(0, years_to_ret * 12)

        ret_path = output_dir / f"{sim_type}_retirement_analysis.png"
        plot_retirement_analysis(
            paths,
            retirement_month,
            results.custom_metrics.get("probability_of_success", 0),
            save_path=ret_path
        )
        saved_files.append(ret_path)
        plt.close()

    return saved_files


def main():
    """Main entry point."""
    args = parse_args()

    config_path = Path(args.config)
    if not config_path.exists():
        print(f"Error: Config file not found: {config_path}")
        sys.exit(1)

    try:
        config = SimulationConfig.from_file(config_path)
    except Exception as e:
        print(f"Error loading config: {e}")
        sys.exit(1)

    if args.seed:
        config.random_seed = args.seed

    config.output_dir = args.output

    try:
        simulator, results = run_simulation(config, args.quiet)

        if not args.quiet:
            print(results.summary())

        output_dir = Path(args.output)
        output_dir.mkdir(parents=True, exist_ok=True)

        results_path = output_dir / f"{results.simulation_type}_results.json"
        results.save_json(results_path)
        if not args.quiet:
            print(f"Results saved to: {results_path}")

        if not args.no_charts:
            saved_charts = generate_charts(simulator, results, output_dir, args.quiet)
            if not args.quiet:
                print(f"Charts saved to: {output_dir}")
                for chart in saved_charts:
                    print(f"  - {chart.name}")

    except Exception as e:
        print(f"Error running simulation: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    if not args.quiet:
        print("\nSimulation complete!")


if __name__ == "__main__":
    main()
