"""Simulation API routes with professional-grade Monte Carlo."""
import numpy as np
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Optional
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import (
    SimulationRequest, SimulationResponse, PercentileRow, LifeEvent,
    AccountType, SocialSecurityInfo, HealthcareInfo, PensionInfo,
    AlternativeInvestment
)
from services.asset_classes import (
    get_risk_based_allocation,
    generate_correlated_returns,
    get_portfolio_stats,
    ASSET_CLASSES
)
from services.financial_calcs import (
    calculate_ss_benefit,
    get_full_retirement_age,
    calculate_rmd,
    get_rmd_age,
    project_healthcare_costs
)
from monte_carlo.utils.stats import calculate_statistics

router = APIRouter()


def calculate_social_security_income(
    ss_info: Optional[SocialSecurityInfo],
    current_age: int,
    current_year: int,
    simulation_year: int,
    inflation_rate: float
) -> float:
    """Calculate Social Security income for a given year."""
    if not ss_info or ss_info.estimated_benefit_at_fra <= 0:
        return 0.0

    years_elapsed = simulation_year - current_year
    age_in_year = current_age + years_elapsed

    # Check if claiming age has been reached
    if age_in_year < ss_info.claiming_age:
        return 0.0

    # Calculate benefit with claiming adjustment
    benefit = calculate_ss_benefit(
        benefit_at_fra=ss_info.estimated_benefit_at_fra,
        birth_year=ss_info.birth_year,
        claiming_age=ss_info.claiming_age,
        include_cola=True,
        cola_rate=ss_info.cola_assumption,
        years_until_claim=ss_info.claiming_age - current_age
    )

    # Apply additional COLA for years after claiming
    years_receiving = age_in_year - ss_info.claiming_age
    if years_receiving > 0:
        benefit *= (1 + ss_info.cola_assumption) ** years_receiving

    return benefit * 12  # Convert monthly to annual


def calculate_pension_income(
    pension_info: Optional[PensionInfo],
    current_age: int,
    current_year: int,
    simulation_year: int
) -> float:
    """Calculate pension income for a given year."""
    if not pension_info or pension_info.annual_benefit <= 0:
        return 0.0

    years_elapsed = simulation_year - current_year
    age_in_year = current_age + years_elapsed

    if age_in_year < pension_info.start_age:
        return 0.0

    benefit = pension_info.annual_benefit

    # Apply COLA if applicable
    if pension_info.has_cola:
        years_receiving = age_in_year - pension_info.start_age
        benefit *= (1 + pension_info.cola_rate) ** years_receiving

    return benefit


def calculate_healthcare_expense(
    healthcare_info: Optional[HealthcareInfo],
    current_age: int,
    simulation_age: int
) -> float:
    """Calculate healthcare expense for a given age."""
    if not healthcare_info:
        # Use default assumptions
        healthcare_info = HealthcareInfo()

    years_elapsed = simulation_age - current_age
    inflation_factor = (1 + healthcare_info.healthcare_inflation_rate) ** years_elapsed

    if simulation_age < 65:
        # Pre-Medicare
        premium = healthcare_info.annual_premium_pre_medicare
        oop = healthcare_info.annual_out_of_pocket_pre_medicare
    else:
        # Medicare
        medicare_monthly = (
            healthcare_info.medicare_part_b_premium +
            healthcare_info.medicare_supplement_premium +
            healthcare_info.medicare_part_d_premium
        )
        premium = medicare_monthly * 12
        oop = healthcare_info.annual_out_of_pocket_medicare

        # Add LTC premium if applicable
        if healthcare_info.has_ltc_insurance:
            premium += healthcare_info.ltc_monthly_premium * 12

    return (premium + oop) * inflation_factor


@router.post("/simulate", response_model=SimulationResponse)
async def run_simulation(request: SimulationRequest):
    """
    Run professional-grade Monte Carlo simulation.

    Features:
    - Multi-asset portfolio with 10 asset classes
    - Correlation-based returns using Cholesky decomposition
    - Fat-tailed distributions (Student-t) for realistic crash modeling
    - Glide path asset allocation based on time horizon
    - Fee integration (advisory + fund expenses)
    - Capital market assumptions from Vanguard, BlackRock, JPMorgan
    """
    try:
        profile = request.profile
        params = request.params

        # Calculate simulation parameters
        current_age = profile.personal.current_age
        retirement_age = profile.personal.retirement_age
        life_expectancy = profile.personal.life_expectancy

        years_to_retirement = retirement_age - current_age
        years_in_retirement = life_expectancy - retirement_age
        total_years = life_expectancy - current_age
        current_year = 2025

        # Get risk-adjusted asset allocation with glide path
        allocation = get_risk_based_allocation(
            risk_tolerance=profile.personal.risk_tolerance,
            years_to_retirement=years_to_retirement
        )

        # Calculate portfolio expected return and volatility
        # Assume 1% total annual fees (advisory + fund expenses) - industry standard
        annual_fee = getattr(params, 'annual_fee', 0.01)
        expected_return, volatility = get_portfolio_stats(allocation, annual_fee)

        # Initial values
        initial_savings = profile.income.current_savings

        # Add alternative investments to initial portfolio value
        alternative_investments_value = sum(
            inv.current_value for inv in profile.alternative_investments
        ) if profile.alternative_investments else 0
        initial_savings += alternative_investments_value

        monthly_contribution = profile.income.monthly_contribution
        employer_match = min(
            profile.income.annual_income * profile.income.employer_match_percent,
            profile.income.employer_match_limit
        )
        total_monthly = monthly_contribution + (employer_match / 12)

        annual_withdrawal = profile.goals.retirement_income_goal

        # Simulation parameters
        n_sims = params.num_simulations
        n_months = total_years * 12
        accumulation_months = years_to_retirement * 12

        # Generate correlated multi-asset returns
        # Use a fresh random state each time (no fixed seed!)
        rng = np.random.default_rng()

        monthly_returns = generate_correlated_returns(
            n_periods=n_months,
            n_simulations=n_sims,
            allocation=allocation,
            annual_fee=annual_fee,
            periods_per_year=12,
            use_fat_tails=True,  # Student-t for realistic crash modeling
            degrees_of_freedom=5.0,  # Industry standard for fat tails
            random_state=rng
        )

        # Convert log returns to simple returns
        returns = np.exp(monthly_returns)

        # Simulate paths with two phases
        paths = np.zeros((n_sims, n_months + 1))
        paths[:, 0] = initial_savings

        # Pre-calculate Social Security and pension for each year (more efficient)
        ss_income_by_year = {}
        pension_income_by_year = {}
        healthcare_by_year = {}

        for year_idx in range(total_years + 1):
            sim_year = current_year + year_idx
            sim_age = current_age + year_idx

            # Social Security income (if configured)
            ss_income_by_year[year_idx] = calculate_social_security_income(
                profile.social_security,
                current_age,
                current_year,
                sim_year,
                params.inflation_rate
            )

            # Pension income (if configured)
            pension_income_by_year[year_idx] = calculate_pension_income(
                profile.pension,
                current_age,
                current_year,
                sim_year
            )

            # Healthcare costs (always calculated)
            healthcare_by_year[year_idx] = calculate_healthcare_expense(
                profile.healthcare,
                current_age,
                sim_age
            )

        for t in range(n_months):
            year_idx = t // 12
            sim_age = current_age + year_idx

            if t < accumulation_months:
                # Accumulation phase: contribute
                contribution = total_monthly
                withdrawal = 0

                # Update allocation at year boundaries (annual rebalancing + glide path)
                if t > 0 and t % 12 == 0:
                    years_elapsed = t // 12
                    new_years_to_retirement = years_to_retirement - years_elapsed
                    allocation = get_risk_based_allocation(
                        risk_tolerance=profile.personal.risk_tolerance,
                        years_to_retirement=new_years_to_retirement
                    )
            else:
                # Distribution phase: withdraw
                contribution = 0
                months_in_retirement = t - accumulation_months
                years_in = months_in_retirement / 12
                inflation_factor = (1 + params.inflation_rate) ** years_in

                # Base retirement income need
                base_withdrawal = annual_withdrawal * inflation_factor

                # Add healthcare costs
                healthcare_cost = healthcare_by_year.get(year_idx, 0)

                # Subtract Social Security income
                ss_income = ss_income_by_year.get(year_idx, 0)

                # Subtract pension income
                pension_income = pension_income_by_year.get(year_idx, 0)

                # Net withdrawal from portfolio = expenses - income sources
                net_withdrawal = max(0, base_withdrawal + healthcare_cost - ss_income - pension_income)
                withdrawal = net_withdrawal / 12

            # Update portfolio value
            paths[:, t + 1] = np.maximum(
                (paths[:, t] + contribution) * returns[:, t] - withdrawal,
                0
            )

        # Calculate success probability (money lasts through retirement)
        final_values = paths[:, -1]
        success_probability = float(np.mean(final_values > 0))

        # Determine confidence zone
        if success_probability >= 0.90:
            confidence_zone = "above"
        elif success_probability >= 0.70:
            confidence_zone = "within"
        else:
            confidence_zone = "below"

        # Generate years array
        years = [current_year + i for i in range(total_years + 1)]

        # Sample paths for visualization (max 100 for performance)
        sample_size = min(100, n_sims)
        sample_indices = rng.choice(n_sims, sample_size, replace=False)

        # Convert monthly paths to yearly for frontend
        yearly_paths = []
        for idx in sample_indices:
            yearly_values = [float(paths[idx, i * 12]) for i in range(total_years + 1)]
            yearly_paths.append(yearly_values)

        # Calculate percentile table
        percentile_indices = [10, 250, 500, 750, 990]  # For 1000 sims
        percentile_labels = ["99th", "75th", "50th", "25th", "1st"]

        sorted_indices = np.argsort(final_values)[::-1]

        percentile_table = []
        for i, (pct_idx, label) in enumerate(zip(percentile_indices, percentile_labels)):
            actual_idx = int(pct_idx * n_sims / 1000)
            actual_idx = min(actual_idx, n_sims - 1)

            sim_idx = sorted_indices[actual_idx]
            path = paths[sim_idx]

            # Find year money goes to zero
            zero_year = None
            zero_months = np.where(path <= 0)[0]
            if len(zero_months) > 0:
                zero_year = current_year + (zero_months[0] // 12)

            # Calculate present value (current dollars)
            years_elapsed = total_years
            inflation_discount = (1 + params.inflation_rate) ** years_elapsed
            end_value_current = path[-1] / inflation_discount

            row = PercentileRow(
                trial_number=actual_idx + 1,
                percentile=label,
                year_5=float(path[min(5 * 12, len(path) - 1)]),
                year_10=float(path[min(10 * 12, len(path) - 1)]),
                year_15=float(path[min(15 * 12, len(path) - 1)]),
                year_20=float(path[min(20 * 12, len(path) - 1)]),
                year_25=float(path[min(25 * 12, len(path) - 1)]),
                end_value_future=float(path[-1]),
                end_value_current=float(end_value_current),
                year_money_zero=zero_year
            )
            percentile_table.append(row)

        # Create milestones
        milestones = [
            LifeEvent(
                name="Retirement",
                year=current_year + years_to_retirement,
                event_type="milestone"
            )
        ]

        for event in profile.goals.life_events:
            milestones.append(event)

        # Calculate statistics
        stats = calculate_statistics(final_values)

        # Add portfolio info to stats
        stats["expected_return"] = round(expected_return * 100, 2)
        stats["volatility"] = round(volatility * 100, 2)
        stats["annual_fee"] = round(annual_fee * 100, 2)

        return SimulationResponse(
            success_probability=success_probability,
            paths=yearly_paths,
            years=years,
            statistics=stats,
            percentile_table=percentile_table,
            milestones=milestones,
            confidence_zone=confidence_zone,
            allocation=allocation  # Include allocation in response
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
