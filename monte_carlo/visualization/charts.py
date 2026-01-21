"""Visualization module for Monte Carlo simulation results."""
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.figure import Figure
from typing import Optional, List, Dict, Any, Tuple
from pathlib import Path

from ..simulators.base import SimulationResults


def setup_style():
    """Set up matplotlib style for consistent visualizations."""
    plt.style.use('seaborn-v0_8-whitegrid')
    plt.rcParams.update({
        'figure.figsize': (12, 8),
        'font.size': 11,
        'axes.titlesize': 14,
        'axes.labelsize': 12,
        'legend.fontsize': 10,
        'figure.dpi': 100
    })


def plot_fan_chart(
    paths: np.ndarray,
    title: str = "Monte Carlo Simulation - Fan Chart",
    percentiles: List[int] = [5, 10, 25, 50, 75, 90, 95],
    time_labels: Optional[List[str]] = None,
    ylabel: str = "Portfolio Value ($)",
    xlabel: str = "Time Period",
    figsize: Tuple[int, int] = (12, 8),
    save_path: Optional[Path] = None
) -> Figure:
    """
    Create a fan chart showing percentile bands over time.

    Args:
        paths: Array of shape (n_simulations, n_periods)
        title: Chart title
        percentiles: Percentiles to plot
        time_labels: Optional custom x-axis labels
        ylabel: Y-axis label
        xlabel: X-axis label
        figsize: Figure size
        save_path: Path to save the figure

    Returns:
        matplotlib Figure
    """
    setup_style()
    fig, ax = plt.subplots(figsize=figsize)

    n_periods = paths.shape[1]
    x = np.arange(n_periods)

    colors = plt.cm.Blues(np.linspace(0.2, 0.8, len(percentiles) // 2 + 1))

    percentile_values = {}
    for p in percentiles:
        percentile_values[p] = np.percentile(paths, p, axis=0)

    sorted_percentiles = sorted(percentiles)
    n_bands = len(sorted_percentiles) // 2

    for i in range(n_bands):
        lower_p = sorted_percentiles[i]
        upper_p = sorted_percentiles[-(i + 1)]

        ax.fill_between(
            x,
            percentile_values[lower_p],
            percentile_values[upper_p],
            alpha=0.3,
            color=colors[i],
            label=f'{lower_p}th-{upper_p}th percentile'
        )

    if 50 in percentile_values:
        ax.plot(x, percentile_values[50], 'b-', linewidth=2, label='Median (50th)')

    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    ax.legend(loc='upper left')

    ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))

    if time_labels and len(time_labels) <= 20:
        ax.set_xticks(np.linspace(0, n_periods - 1, len(time_labels)))
        ax.set_xticklabels(time_labels, rotation=45)

    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches='tight')

    return fig


def plot_distribution(
    values: np.ndarray,
    title: str = "Distribution of Final Values",
    xlabel: str = "Value ($)",
    bins: int = 50,
    show_percentiles: bool = True,
    figsize: Tuple[int, int] = (12, 6),
    save_path: Optional[Path] = None
) -> Figure:
    """
    Create a histogram of final values with key statistics.

    Args:
        values: Array of final values
        title: Chart title
        xlabel: X-axis label
        bins: Number of histogram bins
        show_percentiles: Whether to show percentile lines
        figsize: Figure size
        save_path: Path to save the figure

    Returns:
        matplotlib Figure
    """
    setup_style()
    fig, ax = plt.subplots(figsize=figsize)

    ax.hist(values, bins=bins, density=True, alpha=0.7, color='steelblue', edgecolor='white')

    mean_val = np.mean(values)
    median_val = np.median(values)

    ax.axvline(mean_val, color='red', linestyle='--', linewidth=2, label=f'Mean: ${mean_val:,.0f}')
    ax.axvline(median_val, color='green', linestyle='-', linewidth=2, label=f'Median: ${median_val:,.0f}')

    if show_percentiles:
        p5 = np.percentile(values, 5)
        p95 = np.percentile(values, 95)
        ax.axvline(p5, color='orange', linestyle=':', linewidth=1.5, label=f'5th %ile: ${p5:,.0f}')
        ax.axvline(p95, color='orange', linestyle=':', linewidth=1.5, label=f'95th %ile: ${p95:,.0f}')

    ax.set_xlabel(xlabel)
    ax.set_ylabel('Density')
    ax.set_title(title)
    ax.legend(loc='upper right')

    ax.xaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))

    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches='tight')

    return fig


def plot_var_analysis(
    pnl: np.ndarray,
    var_levels: Dict[float, float],
    portfolio_value: float,
    title: str = "Value at Risk Analysis",
    figsize: Tuple[int, int] = (14, 6),
    save_path: Optional[Path] = None
) -> Figure:
    """
    Create VaR visualization with loss distribution and VaR levels.

    Args:
        pnl: Array of profit/loss values
        var_levels: Dictionary of confidence levels to VaR values
        portfolio_value: Initial portfolio value
        title: Chart title
        figsize: Figure size
        save_path: Path to save the figure

    Returns:
        matplotlib Figure
    """
    setup_style()
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=figsize)

    ax1.hist(pnl, bins=50, density=True, alpha=0.7, color='steelblue', edgecolor='white')

    colors = ['red', 'darkred', 'maroon']
    for i, (conf, var_val) in enumerate(var_levels.items()):
        color = colors[i % len(colors)]
        ax1.axvline(-var_val, color=color, linestyle='--', linewidth=2,
                    label=f'VaR {int(conf*100)}%: ${var_val:,.0f}')

    ax1.axvline(0, color='black', linestyle='-', linewidth=1, alpha=0.5)
    ax1.set_xlabel('Profit/Loss ($)')
    ax1.set_ylabel('Density')
    ax1.set_title('P&L Distribution with VaR Levels')
    ax1.legend()
    ax1.xaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))

    conf_levels = list(var_levels.keys())
    var_values = [var_levels[c] for c in conf_levels]
    var_pct = [v / portfolio_value * 100 for v in var_values]

    x = np.arange(len(conf_levels))
    width = 0.35

    bars1 = ax2.bar(x - width/2, var_values, width, label='VaR ($)', color='steelblue')
    ax2.set_ylabel('VaR ($)', color='steelblue')
    ax2.tick_params(axis='y', labelcolor='steelblue')
    ax2.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))

    ax2_twin = ax2.twinx()
    bars2 = ax2_twin.bar(x + width/2, var_pct, width, label='VaR (%)', color='coral')
    ax2_twin.set_ylabel('VaR (% of Portfolio)', color='coral')
    ax2_twin.tick_params(axis='y', labelcolor='coral')

    ax2.set_xlabel('Confidence Level')
    ax2.set_title('VaR by Confidence Level')
    ax2.set_xticks(x)
    ax2.set_xticklabels([f'{int(c*100)}%' for c in conf_levels])

    lines1, labels1 = ax2.get_legend_handles_labels()
    lines2, labels2 = ax2_twin.get_legend_handles_labels()
    ax2.legend(lines1 + lines2, labels1 + labels2, loc='upper left')

    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches='tight')

    return fig


def plot_option_analysis(
    paths: np.ndarray,
    strike_price: float,
    option_type: str,
    mc_price: float,
    bs_price: float,
    title: str = "Option Pricing Analysis",
    figsize: Tuple[int, int] = (14, 6),
    save_path: Optional[Path] = None
) -> Figure:
    """
    Create option pricing visualization.

    Args:
        paths: Price paths array
        strike_price: Option strike price
        option_type: 'call' or 'put'
        mc_price: Monte Carlo price estimate
        bs_price: Black-Scholes analytical price
        title: Chart title
        figsize: Figure size
        save_path: Path to save the figure

    Returns:
        matplotlib Figure
    """
    setup_style()
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=figsize)

    n_sample = min(100, paths.shape[0])
    sample_indices = np.random.choice(paths.shape[0], n_sample, replace=False)

    for idx in sample_indices:
        ax1.plot(paths[idx], alpha=0.1, color='steelblue', linewidth=0.5)

    median_path = np.median(paths, axis=0)
    ax1.plot(median_path, color='blue', linewidth=2, label='Median Path')

    ax1.axhline(strike_price, color='red', linestyle='--', linewidth=2, label=f'Strike: ${strike_price:.2f}')

    ax1.set_xlabel('Time Steps')
    ax1.set_ylabel('Asset Price ($)')
    ax1.set_title('Sample Price Paths')
    ax1.legend()

    final_prices = paths[:, -1]
    ax2.hist(final_prices, bins=50, density=True, alpha=0.7, color='steelblue', edgecolor='white')

    ax2.axvline(strike_price, color='red', linestyle='--', linewidth=2, label=f'Strike: ${strike_price:.2f}')
    ax2.axvline(np.mean(final_prices), color='green', linestyle='-', linewidth=2,
                label=f'Mean: ${np.mean(final_prices):.2f}')

    if option_type.lower() == 'call':
        itm_mask = final_prices > strike_price
    else:
        itm_mask = final_prices < strike_price
    itm_pct = np.mean(itm_mask) * 100

    ax2.set_xlabel('Final Asset Price ($)')
    ax2.set_ylabel('Density')
    ax2.set_title(f'Final Price Distribution (ITM: {itm_pct:.1f}%)')
    ax2.legend()

    textstr = f'MC Price: ${mc_price:.4f}\nBS Price: ${bs_price:.4f}\nDiff: ${mc_price - bs_price:.4f}'
    props = dict(boxstyle='round', facecolor='wheat', alpha=0.5)
    ax2.text(0.95, 0.95, textstr, transform=ax2.transAxes, fontsize=10,
             verticalalignment='top', horizontalalignment='right', bbox=props)

    plt.suptitle(title, fontsize=14, y=1.02)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches='tight')

    return fig


def plot_retirement_analysis(
    paths: np.ndarray,
    retirement_month: int,
    success_rate: float,
    title: str = "Retirement Planning Analysis",
    figsize: Tuple[int, int] = (14, 6),
    save_path: Optional[Path] = None
) -> Figure:
    """
    Create retirement planning visualization.

    Args:
        paths: Portfolio value paths
        retirement_month: Month index when retirement begins
        success_rate: Probability of not running out of money
        title: Chart title
        figsize: Figure size
        save_path: Path to save the figure

    Returns:
        matplotlib Figure
    """
    setup_style()
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=figsize)

    percentiles = [5, 25, 50, 75, 95]
    n_periods = paths.shape[1]
    x = np.arange(n_periods)

    percentile_values = {p: np.percentile(paths, p, axis=0) for p in percentiles}

    colors = plt.cm.Blues(np.linspace(0.2, 0.8, 3))

    ax1.fill_between(x, percentile_values[5], percentile_values[95],
                     alpha=0.2, color=colors[0], label='5th-95th %ile')
    ax1.fill_between(x, percentile_values[25], percentile_values[75],
                     alpha=0.3, color=colors[1], label='25th-75th %ile')
    ax1.plot(x, percentile_values[50], 'b-', linewidth=2, label='Median')

    if retirement_month < n_periods:
        ax1.axvline(retirement_month, color='green', linestyle='--', linewidth=2,
                    label='Retirement Start')

    ax1.axhline(0, color='red', linestyle=':', linewidth=1, alpha=0.7)

    ax1.set_xlabel('Months')
    ax1.set_ylabel('Portfolio Value ($)')
    ax1.set_title('Portfolio Value Over Time')
    ax1.legend(loc='upper left')
    ax1.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))

    final_values = paths[:, -1]
    success_values = final_values[final_values > 0]
    failure_values = final_values[final_values <= 0]

    if len(success_values) > 0:
        ax2.hist(success_values, bins=40, density=True, alpha=0.7,
                 color='green', edgecolor='white', label=f'Success ({success_rate*100:.1f}%)')

    if len(failure_values) > 0:
        ax2.axvline(0, color='red', linestyle='-', linewidth=3,
                    label=f'Ruin ({(1-success_rate)*100:.1f}%)')

    ax2.set_xlabel('Final Portfolio Value ($)')
    ax2.set_ylabel('Density')
    ax2.set_title(f'Final Value Distribution (Success Rate: {success_rate*100:.1f}%)')
    ax2.legend()
    ax2.xaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))

    plt.suptitle(title, fontsize=14, y=1.02)
    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches='tight')

    return fig


def plot_summary_dashboard(
    results: SimulationResults,
    paths: Optional[np.ndarray] = None,
    figsize: Tuple[int, int] = (16, 12),
    save_path: Optional[Path] = None
) -> Figure:
    """
    Create a comprehensive summary dashboard.

    Args:
        results: SimulationResults object
        paths: Optional paths array for time series plots
        figsize: Figure size
        save_path: Path to save the figure

    Returns:
        matplotlib Figure
    """
    setup_style()
    fig = plt.figure(figsize=figsize)

    ax1 = fig.add_subplot(2, 2, 1)
    final_values = results.final_values
    ax1.hist(final_values, bins=50, density=True, alpha=0.7, color='steelblue', edgecolor='white')
    ax1.axvline(np.mean(final_values), color='red', linestyle='--', label=f'Mean: ${np.mean(final_values):,.0f}')
    ax1.axvline(np.median(final_values), color='green', linestyle='-', label=f'Median: ${np.median(final_values):,.0f}')
    ax1.set_xlabel('Final Value ($)')
    ax1.set_ylabel('Density')
    ax1.set_title('Distribution of Final Values')
    ax1.legend()
    ax1.xaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))

    if paths is not None:
        ax2 = fig.add_subplot(2, 2, 2)
        percentiles = [10, 25, 50, 75, 90]
        x = np.arange(paths.shape[1])

        for p in percentiles:
            values = np.percentile(paths, p, axis=0)
            ax2.plot(x, values, label=f'{p}th %ile', alpha=0.8)

        ax2.set_xlabel('Time Period')
        ax2.set_ylabel('Value ($)')
        ax2.set_title('Percentile Paths Over Time')
        ax2.legend()
        ax2.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))

    ax3 = fig.add_subplot(2, 2, 3)
    stats = results.statistics
    metrics = ['mean', 'median', 'std', 'min', 'max']
    values = [stats.get(m, 0) for m in metrics]

    bars = ax3.barh(metrics, values, color='steelblue')
    ax3.set_xlabel('Value ($)')
    ax3.set_title('Key Statistics')
    ax3.xaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))

    for bar, val in zip(bars, values):
        ax3.text(val, bar.get_y() + bar.get_height()/2,
                 f' ${val:,.0f}', va='center', fontsize=9)

    ax4 = fig.add_subplot(2, 2, 4)
    percentiles = results.percentiles
    pct_labels = sorted(percentiles.keys())
    pct_values = [percentiles[k] for k in pct_labels]

    ax4.plot(range(len(pct_labels)), pct_values, 'o-', color='steelblue', markersize=8)
    ax4.set_xticks(range(len(pct_labels)))
    ax4.set_xticklabels(pct_labels, rotation=45)
    ax4.set_xlabel('Percentile')
    ax4.set_ylabel('Value ($)')
    ax4.set_title('Percentile Distribution')
    ax4.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))
    ax4.grid(True, alpha=0.3)

    plt.suptitle(f'{results.simulation_type.upper()} Simulation Summary\n'
                 f'({results.num_simulations:,} simulations, {results.time_horizon_years} years)',
                 fontsize=14, y=1.02)

    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches='tight')

    return fig


def save_all_charts(
    results: SimulationResults,
    paths: Optional[np.ndarray],
    output_dir: Path,
    simulation_type: str
) -> List[Path]:
    """
    Generate and save all relevant charts for a simulation.

    Args:
        results: SimulationResults object
        paths: Optional paths array
        output_dir: Directory to save charts
        simulation_type: Type of simulation for naming

    Returns:
        List of saved file paths
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    saved_files = []

    dist_path = output_dir / f"{simulation_type}_distribution.png"
    plot_distribution(results.final_values, save_path=dist_path)
    saved_files.append(dist_path)
    plt.close()

    if paths is not None:
        fan_path = output_dir / f"{simulation_type}_fan_chart.png"
        plot_fan_chart(paths, save_path=fan_path)
        saved_files.append(fan_path)
        plt.close()

    summary_path = output_dir / f"{simulation_type}_summary.png"
    plot_summary_dashboard(results, paths, save_path=summary_path)
    saved_files.append(summary_path)
    plt.close()

    return saved_files
