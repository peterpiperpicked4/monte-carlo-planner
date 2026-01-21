"""
Professional Financial Calculations Service

Includes:
- Social Security benefit calculations with claiming age optimization
- Required Minimum Distribution (RMD) calculations
- Tax-efficient withdrawal sequencing
- Healthcare cost projections
"""
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import numpy as np


# ============================================================================
# SOCIAL SECURITY CALCULATIONS
# ============================================================================

# Full Retirement Age by birth year
FRA_TABLE = {
    1943: 66.0,
    1944: 66.0,
    1945: 66.0,
    1946: 66.0,
    1947: 66.0,
    1948: 66.0,
    1949: 66.0,
    1950: 66.0,
    1951: 66.0,
    1952: 66.0,
    1953: 66.0,
    1954: 66.0,
    1955: 66.1667,  # 66 and 2 months
    1956: 66.3333,  # 66 and 4 months
    1957: 66.5,     # 66 and 6 months
    1958: 66.6667,  # 66 and 8 months
    1959: 66.8333,  # 66 and 10 months
    1960: 67.0,     # 67 for 1960 and later
}


def get_full_retirement_age(birth_year: int) -> float:
    """Get Full Retirement Age based on birth year."""
    if birth_year <= 1937:
        return 65.0
    elif birth_year <= 1942:
        return 66.0
    elif birth_year >= 1960:
        return 67.0
    else:
        return FRA_TABLE.get(birth_year, 67.0)


def calculate_ss_benefit(
    benefit_at_fra: float,
    birth_year: int,
    claiming_age: int,
    include_cola: bool = True,
    cola_rate: float = 0.02,
    years_until_claim: int = 0
) -> float:
    """
    Calculate adjusted Social Security benefit based on claiming age.

    Early claiming (62-FRA): Reduced by 5/9 of 1% per month for first 36 months,
                            then 5/12 of 1% for additional months
    Delayed claiming (FRA-70): Increased by 8% per year (2/3% per month)

    Args:
        benefit_at_fra: Estimated monthly benefit at Full Retirement Age
        birth_year: Year of birth
        claiming_age: Age when claiming benefits (62-70)
        include_cola: Whether to apply COLA adjustment
        cola_rate: Annual COLA rate
        years_until_claim: Years from now until claiming (for COLA calc)

    Returns:
        Adjusted monthly benefit amount
    """
    if benefit_at_fra <= 0:
        return 0.0

    fra = get_full_retirement_age(birth_year)

    # Calculate months difference from FRA
    months_from_fra = int((claiming_age - fra) * 12)

    adjustment_factor = 1.0

    if months_from_fra < 0:
        # Early claiming - reduction
        months_early = abs(months_from_fra)

        # First 36 months: 5/9 of 1% per month
        first_36_months = min(months_early, 36)
        reduction_first_36 = first_36_months * (5 / 9 / 100)

        # Beyond 36 months: 5/12 of 1% per month
        months_beyond_36 = max(0, months_early - 36)
        reduction_beyond_36 = months_beyond_36 * (5 / 12 / 100)

        adjustment_factor = 1.0 - reduction_first_36 - reduction_beyond_36

    elif months_from_fra > 0:
        # Delayed claiming - 8% per year increase (capped at age 70)
        months_delayed = min(months_from_fra, int((70 - fra) * 12))
        adjustment_factor = 1.0 + (months_delayed * (8 / 12 / 100))

    # Apply COLA if requested
    adjusted_benefit = benefit_at_fra * adjustment_factor

    if include_cola and years_until_claim > 0:
        adjusted_benefit *= (1 + cola_rate) ** years_until_claim

    return adjusted_benefit


def optimize_ss_claiming_age(
    benefit_at_fra: float,
    birth_year: int,
    life_expectancy: int,
    discount_rate: float = 0.03
) -> Dict:
    """
    Analyze optimal Social Security claiming age.

    Returns present value of benefits for ages 62-70 and recommendation.
    """
    current_year = 2025
    fra = get_full_retirement_age(birth_year)
    current_age = current_year - birth_year

    results = {}

    for claiming_age in range(62, 71):
        if claiming_age < current_age:
            continue

        monthly_benefit = calculate_ss_benefit(
            benefit_at_fra, birth_year, claiming_age
        )

        # Years of benefits
        years_receiving = max(0, life_expectancy - claiming_age)

        # Simple present value calculation
        pv = 0
        years_to_claim = claiming_age - current_age

        for year in range(years_receiving):
            annual_benefit = monthly_benefit * 12 * (1.02 ** year)  # 2% COLA
            years_from_now = years_to_claim + year
            pv += annual_benefit / ((1 + discount_rate) ** years_from_now)

        results[claiming_age] = {
            "monthly_benefit": round(monthly_benefit, 2),
            "annual_benefit": round(monthly_benefit * 12, 2),
            "total_lifetime": round(monthly_benefit * 12 * years_receiving, 2),
            "present_value": round(pv, 2),
            "years_receiving": years_receiving
        }

    # Find optimal age
    if results:
        optimal_age = max(results.keys(), key=lambda x: results[x]["present_value"])
    else:
        optimal_age = 67

    return {
        "analysis": results,
        "optimal_claiming_age": optimal_age,
        "fra": fra
    }


# ============================================================================
# REQUIRED MINIMUM DISTRIBUTIONS (RMD)
# ============================================================================

# IRS Uniform Lifetime Table (2024+)
RMD_TABLE = {
    72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0,
    79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0,
    86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8,
    93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8,
    100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2, 104: 4.9, 105: 4.6, 106: 4.3,
    107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4, 112: 3.3, 113: 3.1,
    114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3, 120: 2.0
}


def get_rmd_age() -> int:
    """Get RMD starting age (73 as of SECURE 2.0 Act)."""
    return 73


def calculate_rmd(account_balance: float, age: int) -> float:
    """
    Calculate Required Minimum Distribution for a given age.

    Uses the IRS Uniform Lifetime Table.

    Args:
        account_balance: Year-end balance of traditional IRA/401k
        age: Owner's age

    Returns:
        Required minimum distribution amount
    """
    rmd_age = get_rmd_age()

    if age < rmd_age:
        return 0.0

    if age > 120:
        age = 120

    distribution_period = RMD_TABLE.get(age, 2.0)

    return account_balance / distribution_period


def project_rmds(
    account_balance: float,
    current_age: int,
    life_expectancy: int,
    growth_rate: float = 0.05
) -> List[Dict]:
    """
    Project RMDs over lifetime.

    Args:
        account_balance: Current account balance
        current_age: Current age
        life_expectancy: Expected age at death
        growth_rate: Expected annual growth rate

    Returns:
        List of yearly RMD projections
    """
    rmd_age = get_rmd_age()
    projections = []
    balance = account_balance

    for age in range(current_age, life_expectancy + 1):
        rmd = calculate_rmd(balance, age) if age >= rmd_age else 0

        projections.append({
            "age": age,
            "year_start_balance": round(balance, 2),
            "rmd_amount": round(rmd, 2),
            "rmd_percent": round(rmd / balance * 100, 2) if balance > 0 else 0
        })

        # Update balance: growth minus withdrawal
        balance = (balance - rmd) * (1 + growth_rate)
        balance = max(0, balance)

    return projections


# ============================================================================
# TAX-EFFICIENT WITHDRAWAL SEQUENCING
# ============================================================================

@dataclass
class AccountBalance:
    """Account balance with tax treatment."""
    name: str
    balance: float
    account_type: str  # traditional, roth, taxable
    has_rmd: bool = True


def calculate_withdrawal_sequence(
    accounts: List[AccountBalance],
    annual_need: float,
    age: int,
    marginal_tax_rate: float = 0.22
) -> Dict:
    """
    Calculate optimal withdrawal sequence for tax efficiency.

    General rules:
    1. Take RMDs first (required)
    2. Fill low tax brackets with traditional account withdrawals
    3. Use taxable accounts for capital gains (lower rate)
    4. Preserve Roth for tax-free growth

    Args:
        accounts: List of account balances
        annual_need: Annual withdrawal need
        age: Current age
        marginal_tax_rate: Estimated marginal tax rate

    Returns:
        Withdrawal plan with tax impact
    """
    remaining_need = annual_need
    withdrawals = []
    total_tax = 0

    # Step 1: RMDs from traditional accounts (required)
    rmd_age = get_rmd_age()
    for account in accounts:
        if account.account_type == "traditional" and account.has_rmd and age >= rmd_age:
            rmd = calculate_rmd(account.balance, age)
            withdrawal = min(rmd, remaining_need) if remaining_need > 0 else rmd

            withdrawals.append({
                "account": account.name,
                "amount": round(withdrawal, 2),
                "type": "RMD",
                "taxable": True,
                "tax": round(withdrawal * marginal_tax_rate, 2)
            })

            remaining_need -= withdrawal
            total_tax += withdrawal * marginal_tax_rate

    # Step 2: Taxable accounts (capital gains)
    capital_gains_rate = 0.15  # Assume long-term capital gains rate
    for account in accounts:
        if account.account_type == "taxable" and remaining_need > 0:
            withdrawal = min(account.balance, remaining_need)
            # Assume 50% of withdrawal is gains
            taxable_gains = withdrawal * 0.5

            withdrawals.append({
                "account": account.name,
                "amount": round(withdrawal, 2),
                "type": "Taxable",
                "taxable": True,
                "tax": round(taxable_gains * capital_gains_rate, 2)
            })

            remaining_need -= withdrawal
            total_tax += taxable_gains * capital_gains_rate

    # Step 3: Traditional accounts (if more needed)
    for account in accounts:
        if account.account_type == "traditional" and remaining_need > 0:
            rmd = calculate_rmd(account.balance, age) if age >= rmd_age else 0
            available = account.balance - rmd  # Already withdrew RMD
            withdrawal = min(available, remaining_need)

            if withdrawal > 0:
                withdrawals.append({
                    "account": account.name,
                    "amount": round(withdrawal, 2),
                    "type": "Traditional",
                    "taxable": True,
                    "tax": round(withdrawal * marginal_tax_rate, 2)
                })

                remaining_need -= withdrawal
                total_tax += withdrawal * marginal_tax_rate

    # Step 4: Roth accounts (last resort - preserve tax-free growth)
    for account in accounts:
        if account.account_type == "roth" and remaining_need > 0:
            withdrawal = min(account.balance, remaining_need)

            withdrawals.append({
                "account": account.name,
                "amount": round(withdrawal, 2),
                "type": "Roth",
                "taxable": False,
                "tax": 0
            })

            remaining_need -= withdrawal

    return {
        "withdrawals": withdrawals,
        "total_withdrawn": round(annual_need - remaining_need, 2),
        "total_tax": round(total_tax, 2),
        "effective_tax_rate": round(total_tax / (annual_need - remaining_need) * 100, 2) if (annual_need - remaining_need) > 0 else 0,
        "shortfall": round(max(0, remaining_need), 2)
    }


# ============================================================================
# HEALTHCARE COST PROJECTIONS
# ============================================================================

def project_healthcare_costs(
    current_age: int,
    life_expectancy: int,
    pre_medicare_premium: float = 12000,
    pre_medicare_oop: float = 3000,
    medicare_monthly_total: float = 410,  # Part B + Supplement + Part D
    medicare_oop: float = 5000,
    healthcare_inflation: float = 0.05
) -> List[Dict]:
    """
    Project lifetime healthcare costs.

    Args:
        current_age: Current age
        life_expectancy: Expected age at death
        pre_medicare_premium: Annual premium before Medicare
        pre_medicare_oop: Annual out-of-pocket before Medicare
        medicare_monthly_total: Total monthly Medicare costs (B + Supp + D)
        medicare_oop: Annual out-of-pocket with Medicare
        healthcare_inflation: Annual healthcare cost inflation rate

    Returns:
        Year-by-year healthcare cost projections
    """
    medicare_age = 65
    projections = []

    for age in range(current_age, life_expectancy + 1):
        years_from_now = age - current_age
        inflation_factor = (1 + healthcare_inflation) ** years_from_now

        if age < medicare_age:
            # Pre-Medicare costs
            premium = pre_medicare_premium * inflation_factor
            oop = pre_medicare_oop * inflation_factor
        else:
            # Medicare costs
            premium = medicare_monthly_total * 12 * inflation_factor
            oop = medicare_oop * inflation_factor

        total = premium + oop

        projections.append({
            "age": age,
            "premium": round(premium, 2),
            "out_of_pocket": round(oop, 2),
            "total": round(total, 2),
            "coverage_type": "Pre-Medicare" if age < medicare_age else "Medicare"
        })

    return projections


def calculate_lifetime_healthcare_cost(
    current_age: int,
    life_expectancy: int,
    healthcare_inflation: float = 0.05,
    discount_rate: float = 0.03
) -> Dict:
    """
    Calculate total lifetime healthcare costs with present value.
    """
    projections = project_healthcare_costs(
        current_age, life_expectancy,
        healthcare_inflation=healthcare_inflation
    )

    total_nominal = sum(p["total"] for p in projections)

    # Calculate present value
    present_value = sum(
        p["total"] / ((1 + discount_rate) ** (p["age"] - current_age))
        for p in projections
    )

    # Pre vs Post Medicare
    pre_medicare = sum(p["total"] for p in projections if p["coverage_type"] == "Pre-Medicare")
    post_medicare = sum(p["total"] for p in projections if p["coverage_type"] == "Medicare")

    return {
        "total_nominal": round(total_nominal, 2),
        "present_value": round(present_value, 2),
        "pre_medicare_total": round(pre_medicare, 2),
        "post_medicare_total": round(post_medicare, 2),
        "average_annual": round(total_nominal / len(projections), 2),
        "projections": projections
    }
