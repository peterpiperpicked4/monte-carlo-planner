"""Pydantic models for API requests and responses."""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class FilingStatus(str, Enum):
    SINGLE = "single"
    MARRIED_FILING_JOINTLY = "married_filing_jointly"
    MARRIED_FILING_SEPARATELY = "married_filing_separately"
    HEAD_OF_HOUSEHOLD = "head_of_household"


# ============================================================================
# PHASE 1: Enhanced Account Types for Tax-Advantaged Modeling
# ============================================================================

class AccountType(str, Enum):
    """Tax-advantaged account types with different treatment."""
    TRADITIONAL_401K = "traditional_401k"  # Pre-tax contributions, taxed on withdrawal
    ROTH_401K = "roth_401k"  # After-tax contributions, tax-free growth & withdrawal
    TRADITIONAL_IRA = "traditional_ira"  # Pre-tax contributions, taxed on withdrawal
    ROTH_IRA = "roth_ira"  # After-tax contributions, tax-free growth & withdrawal
    BROKERAGE = "brokerage"  # Taxable account - capital gains taxes
    HSA = "hsa"  # Triple tax-advantaged for healthcare
    FIVE29 = "529"  # Education savings - tax-free for qualified expenses
    PENSION = "pension"  # Defined benefit pension


class AccountInfo(BaseModel):
    """Individual investment account with tax treatment."""
    account_type: AccountType
    balance: float = Field(..., ge=0, description="Current account balance")
    annual_contribution: float = Field(default=0, ge=0, description="Annual contribution amount")
    employer_match: float = Field(default=0, ge=0, description="Annual employer match (401k only)")
    cost_basis: Optional[float] = Field(default=None, description="Cost basis for taxable accounts")

    # 401k/IRA specific
    has_rmd: bool = Field(default=True, description="Subject to RMDs (not Roth IRA)")

    class Config:
        json_schema_extra = {
            "example": {
                "account_type": "traditional_401k",
                "balance": 500000,
                "annual_contribution": 22500,
                "employer_match": 10000
            }
        }


class SocialSecurityInfo(BaseModel):
    """Social Security benefit information."""
    # Primary earner
    estimated_benefit_at_fra: float = Field(
        default=0, ge=0,
        description="Estimated monthly benefit at Full Retirement Age"
    )
    birth_year: int = Field(
        default=1970, ge=1940, le=2010,
        description="Birth year to determine FRA"
    )
    claiming_age: int = Field(
        default=67, ge=62, le=70,
        description="Planned claiming age (62-70)"
    )

    # Spouse (if married)
    spouse_benefit_at_fra: float = Field(
        default=0, ge=0,
        description="Spouse's estimated monthly benefit at FRA"
    )
    spouse_birth_year: Optional[int] = Field(
        default=None, ge=1940, le=2010
    )
    spouse_claiming_age: Optional[int] = Field(
        default=None, ge=62, le=70
    )

    # Adjustments
    cola_assumption: float = Field(
        default=0.02, ge=0, le=0.05,
        description="Cost of living adjustment assumption"
    )

    def get_fra(self, birth_year: int) -> int:
        """Get Full Retirement Age based on birth year."""
        if birth_year <= 1937:
            return 65
        elif birth_year <= 1942:
            return 66
        elif birth_year <= 1954:
            return 66  # 66 + months based on year
        elif birth_year <= 1959:
            return 67  # 66 + months based on year
        else:
            return 67


class HealthcareInfo(BaseModel):
    """Healthcare cost projections."""
    # Pre-Medicare (before 65)
    annual_premium_pre_medicare: float = Field(
        default=12000, ge=0,
        description="Annual health insurance premium before Medicare"
    )
    annual_out_of_pocket_pre_medicare: float = Field(
        default=3000, ge=0,
        description="Expected annual out-of-pocket costs before Medicare"
    )

    # Medicare (65+)
    medicare_part_b_premium: float = Field(
        default=175, ge=0,
        description="Monthly Medicare Part B premium (income-adjusted)"
    )
    medicare_supplement_premium: float = Field(
        default=200, ge=0,
        description="Monthly Medicare Supplement (Medigap) premium"
    )
    medicare_part_d_premium: float = Field(
        default=35, ge=0,
        description="Monthly Part D prescription drug premium"
    )
    annual_out_of_pocket_medicare: float = Field(
        default=5000, ge=0,
        description="Expected annual out-of-pocket with Medicare"
    )

    # Long-term care
    has_ltc_insurance: bool = Field(default=False)
    ltc_monthly_premium: float = Field(default=0, ge=0)
    ltc_daily_benefit: float = Field(default=0, ge=0)

    # Healthcare inflation (typically higher than general inflation)
    healthcare_inflation_rate: float = Field(
        default=0.05, ge=0, le=0.10,
        description="Healthcare cost inflation rate (typically 5-7%)"
    )


class AlternativeInvestment(BaseModel):
    """Alternative investment holding."""
    name: str = Field(..., description="Investment name/description")
    investment_type: str = Field(
        ...,
        description="Type: real_estate, private_equity, hedge_fund, crypto, annuity, other"
    )
    current_value: float = Field(..., ge=0)
    expected_return: float = Field(
        default=0.07, ge=-0.5, le=0.5,
        description="Expected annual return"
    )
    volatility: float = Field(
        default=0.15, ge=0, le=1.0,
        description="Expected volatility/std dev"
    )
    liquidity: str = Field(
        default="medium",
        description="Liquidity: high, medium, low, illiquid"
    )
    # Annuity-specific fields
    is_annuity: bool = Field(default=False)
    annuity_payout_start_age: Optional[int] = Field(default=None)
    annuity_monthly_payout: Optional[float] = Field(default=None)


class PensionInfo(BaseModel):
    """Defined benefit pension information."""
    annual_benefit: float = Field(
        default=0, ge=0,
        description="Annual pension benefit amount"
    )
    start_age: int = Field(
        default=65, ge=50, le=75,
        description="Age pension payments begin"
    )
    has_cola: bool = Field(
        default=False,
        description="Pension includes cost-of-living adjustment"
    )
    cola_rate: float = Field(
        default=0.02, ge=0, le=0.05,
        description="COLA rate if applicable"
    )
    survivor_benefit_percent: float = Field(
        default=0.5, ge=0, le=1.0,
        description="Survivor benefit as percentage of pension"
    )


class LifeEvent(BaseModel):
    """A life event/milestone."""
    name: str
    year: int
    amount: Optional[float] = None
    event_type: str = "milestone"  # milestone, expense, income


class PersonalInfo(BaseModel):
    """Personal information section."""
    current_age: int = Field(..., ge=18, le=100)
    retirement_age: int = Field(default=65, ge=30, le=100)
    life_expectancy: int = Field(default=90, ge=50, le=120)
    state: str = Field(default="CA", max_length=2)
    filing_status: FilingStatus = FilingStatus.SINGLE
    risk_tolerance: int = Field(default=5, ge=1, le=10)


class IncomeInfo(BaseModel):
    """Income and savings information."""
    annual_income: float = Field(..., ge=0)
    income_growth_rate: float = Field(default=0.03, ge=0, le=0.20)
    current_savings: float = Field(..., ge=0)
    monthly_contribution: float = Field(default=1000, ge=0)
    employer_match_percent: float = Field(default=0.03, ge=0, le=1.0)
    employer_match_limit: float = Field(default=6000, ge=0)


class AssetsDebts(BaseModel):
    """Assets and debts information."""
    home_value: float = Field(default=0, ge=0)
    mortgage_balance: float = Field(default=0, ge=0)
    other_real_estate: float = Field(default=0, ge=0)
    vehicles_value: float = Field(default=0, ge=0)
    other_debts: float = Field(default=0, ge=0)
    expected_inheritance: float = Field(default=0, ge=0)
    inheritance_year: Optional[int] = None


class Goals(BaseModel):
    """Financial goals."""
    retirement_income_goal: float = Field(..., ge=0)
    legacy_goal: float = Field(default=0, ge=0)
    life_events: List[LifeEvent] = Field(default_factory=list)


class UserProfile(BaseModel):
    """Complete user profile for simulation."""
    personal: PersonalInfo
    income: IncomeInfo
    assets: AssetsDebts
    goals: Goals

    # Phase 1: Enhanced Account Types (optional for backward compatibility)
    accounts: List[AccountInfo] = Field(
        default_factory=list,
        description="List of investment accounts with tax treatment"
    )

    # Phase 2: Income Sources
    social_security: Optional[SocialSecurityInfo] = Field(
        default=None,
        description="Social Security benefit information"
    )
    pension: Optional[PensionInfo] = Field(
        default=None,
        description="Defined benefit pension information"
    )

    # Phase 3: Healthcare Planning
    healthcare: Optional[HealthcareInfo] = Field(
        default=None,
        description="Healthcare cost projections"
    )

    # Phase 4: Alternative Investments
    alternative_investments: List[AlternativeInvestment] = Field(
        default_factory=list,
        description="Alternative investment holdings"
    )


class SimulationParams(BaseModel):
    """Simulation parameters."""
    num_simulations: int = Field(default=1000, ge=100, le=100000)
    expected_return: Optional[float] = None  # Auto-calculated from risk tolerance if None
    volatility: Optional[float] = None  # Auto-calculated from risk tolerance if None
    inflation_rate: float = Field(default=0.025, ge=0, le=0.10)


class SimulationRequest(BaseModel):
    """Request body for simulation endpoint."""
    profile: UserProfile
    params: SimulationParams = Field(default_factory=SimulationParams)


class PercentileRow(BaseModel):
    """A row in the percentile table."""
    trial_number: int
    percentile: str
    year_5: float
    year_10: float
    year_15: float
    year_20: float
    year_25: float
    end_value_future: float
    end_value_current: float
    year_money_zero: Optional[int] = None


class SimulationResponse(BaseModel):
    """Response from simulation endpoint."""
    success_probability: float
    paths: List[List[float]]  # Sampled paths for visualization
    years: List[int]
    statistics: Dict[str, float]
    percentile_table: List[PercentileRow]
    milestones: List[LifeEvent]
    confidence_zone: str  # "above", "within", "below"
    allocation: Optional[Dict[str, float]] = None  # Asset allocation breakdown


class AnalyzeRequest(BaseModel):
    """Request for AI analysis."""
    profile: UserProfile
    simulation_results: Dict[str, Any]


class AIRecommendation(BaseModel):
    """A single AI recommendation."""
    title: str
    description: str
    impact: str  # "high", "medium", "low"
    category: str  # "savings", "retirement", "risk", "debt"


class AnalyzeResponse(BaseModel):
    """Response from AI analysis endpoint."""
    summary: str
    recommendations: List[AIRecommendation]
    risk_assessment: str
    confidence_score: float
