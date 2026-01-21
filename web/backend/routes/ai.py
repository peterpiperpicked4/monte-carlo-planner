"""AI Analysis API routes."""
from fastapi import APIRouter, HTTPException
import os

from models import (
    AnalyzeRequest, AnalyzeResponse, AIRecommendation,
    DiscoveryRequest, DiscoveryResponse, DiscoveryQuestion
)
from services.claude import analyze_profile, discover_profile

router = APIRouter()


def format_currency_mock(value: float) -> str:
    """Format number as currency for mock responses."""
    if value >= 1_000_000:
        return f"${value / 1_000_000:.1f}M"
    elif value >= 1_000:
        return f"${value / 1_000:.0f}K"
    else:
        return f"${value:.0f}"


def generate_mock_analysis(request: AnalyzeRequest) -> AnalyzeResponse:
    """Generate a mock analysis based on actual simulation results."""
    success_prob = request.simulation_results.get("success_probability", 0)
    success_pct = int(success_prob * 100)
    stats = request.simulation_results.get("statistics", {})
    median_value = stats.get("median", 0)
    var_95 = stats.get("var_95", 0)

    profile = request.profile
    current_age = profile.personal.current_age
    retirement_age = profile.personal.retirement_age
    years_to_retire = retirement_age - current_age
    risk_tolerance = profile.personal.risk_tolerance
    monthly_contrib = profile.income.monthly_contribution
    annual_income = profile.income.annual_income

    # Generate dynamic summary based on actual results
    if success_prob >= 0.9:
        status = "excellent"
        summary = f"Your financial plan shows strong results with a {success_pct}% probability of success. You're well-positioned to meet your retirement goals with a projected median portfolio value of {format_currency_mock(median_value)}."
    elif success_prob >= 0.7:
        status = "good"
        summary = f"Your financial plan shows a {success_pct}% probability of success, which is within a reasonable range but has room for improvement. Consider the recommendations below to strengthen your position."
    elif success_prob >= 0.5:
        status = "concerning"
        summary = f"With a {success_pct}% probability of success, your current plan has significant risks. The 5th percentile outcome shows a portfolio value of {format_currency_mock(var_95)}, indicating potential shortfalls. Action is recommended."
    else:
        status = "critical"
        summary = f"Your current plan shows only a {success_pct}% probability of meeting your retirement goals. This requires immediate attention and significant adjustments to your savings strategy."

    # Generate dynamic recommendations based on profile and results
    recommendations = []

    # Always check employer match
    if profile.income.employer_match_percent > 0:
        recommendations.append(AIRecommendation(
            title="Maximize Employer Match",
            description=f"Ensure you're contributing enough to capture the full {profile.income.employer_match_percent * 100:.0f}% employer match up to {format_currency_mock(profile.income.employer_match_limit)} - this is essentially free money.",
            impact="high",
            category="savings"
        ))

    # Savings rate recommendation
    savings_rate = (monthly_contrib * 12) / annual_income if annual_income > 0 else 0
    if savings_rate < 0.15:
        recommendations.append(AIRecommendation(
            title="Increase Savings Rate",
            description=f"Your current savings rate is approximately {savings_rate * 100:.0f}% of income. Consider increasing to 15-20% to improve your retirement outlook.",
            impact="high" if success_prob < 0.7 else "medium",
            category="savings"
        ))

    # Time-based recommendations
    if years_to_retire > 20:
        recommendations.append(AIRecommendation(
            title="Leverage Time Horizon",
            description=f"With {years_to_retire} years until retirement, you have time to recover from market downturns. Consider maintaining growth-oriented investments.",
            impact="medium",
            category="risk"
        ))
    elif years_to_retire <= 10:
        recommendations.append(AIRecommendation(
            title="Begin Transition Planning",
            description=f"With only {years_to_retire} years until retirement, start gradually shifting toward more conservative investments to protect your gains.",
            impact="high",
            category="risk"
        ))

    # Debt recommendations
    total_debt = profile.assets.mortgage_balance + profile.assets.other_debts
    if total_debt > annual_income * 2:
        recommendations.append(AIRecommendation(
            title="Prioritize Debt Reduction",
            description=f"Your total debt of {format_currency_mock(total_debt)} is significant. Consider accelerating debt payoff, especially high-interest debts.",
            impact="high",
            category="debt"
        ))

    # Add generic recommendation if we don't have enough
    if len(recommendations) < 3:
        recommendations.append(AIRecommendation(
            title="Review Asset Allocation",
            description=f"With a risk tolerance of {risk_tolerance}/10, ensure your portfolio allocation matches your comfort level and goals.",
            impact="medium",
            category="risk"
        ))

    if len(recommendations) < 4:
        recommendations.append(AIRecommendation(
            title="Build Emergency Fund",
            description="Maintain 3-6 months of expenses in liquid savings before aggressive investing to avoid early withdrawals.",
            impact="medium",
            category="savings"
        ))

    # Dynamic risk assessment
    if risk_tolerance <= 3:
        risk_text = f"Your conservative risk tolerance ({risk_tolerance}/10) prioritizes capital preservation. "
    elif risk_tolerance <= 7:
        risk_text = f"Your moderate risk tolerance ({risk_tolerance}/10) balances growth and stability. "
    else:
        risk_text = f"Your aggressive risk tolerance ({risk_tolerance}/10) favors growth over stability. "

    if years_to_retire > 20:
        risk_text += "Given your long time horizon, you may be able to tolerate more risk if desired."
    elif years_to_retire > 10:
        risk_text += "This is appropriate for your time horizon."
    else:
        risk_text += "Consider reducing risk as you approach retirement to protect your accumulated savings."

    return AnalyzeResponse(
        summary=summary,
        recommendations=recommendations[:4],  # Limit to 4 recommendations
        risk_assessment=risk_text,
        confidence_score=0.85
    )


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_simulation(request: AnalyzeRequest):
    """Analyze simulation results using Claude AI."""
    try:
        # Check for API key
        if not os.getenv("ANTHROPIC_API_KEY"):
            # Return dynamic mock response based on actual results
            return generate_mock_analysis(request)

        result = await analyze_profile(request.profile, request.simulation_results)

        recommendations = [
            AIRecommendation(**rec) for rec in result.get("recommendations", [])
        ]

        return AnalyzeResponse(
            summary=result.get("summary", "Analysis complete."),
            recommendations=recommendations,
            risk_assessment=result.get("risk_assessment", ""),
            confidence_score=0.90
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def generate_mock_discovery(request: DiscoveryRequest) -> DiscoveryResponse:
    """Generate mock discovery response based on profile gaps."""
    profile = request.profile
    answered = set(request.answered_questions)

    # Calculate completeness score based on filled fields
    important_fields = [
        ('current_age', 35),
        ('retirement_age', 65),
        ('current_savings', 0),
        ('annual_income', 0),
        ('monthly_contribution', 0),
        ('risk_tolerance', 5),
        ('ss_benefit_at_fra', 0),
        ('pension_annual_benefit', 0),
        ('retirement_income_goal', 80000),
        ('legacy_goal', 0),
        ('hc_pre_medicare_premium', 0),
        ('employer_match_percent', 0),
    ]

    filled_count = 0
    for field, default in important_fields:
        value = profile.get(field)
        if value is not None and value != default:
            filled_count += 1

    completeness_score = min(1.0, filled_count / len(important_fields) + 0.3)

    # Generate questions based on gaps
    questions = []

    # Check Social Security
    if 'social_security' not in answered and (
        not profile.get('ss_benefit_at_fra') or profile.get('ss_benefit_at_fra') == 0
    ):
        questions.append(DiscoveryQuestion(
            id='social_security',
            question="Have you checked your estimated Social Security benefit? This can significantly impact your retirement income.",
            question_type='Social Security',
            suggestions=[
                {'label': 'Yes, about $2,000/month', 'value': {'ss_benefit_at_fra': 2000}},
                {'label': 'Yes, about $3,000/month', 'value': {'ss_benefit_at_fra': 3000}},
                {'label': "I haven't checked yet", 'value': None},
                {'label': "I don't expect SS benefits", 'value': {'ss_benefit_at_fra': 0}}
            ],
            priority=1
        ))

    # Check pension
    if 'pension' not in answered and (
        not profile.get('pension_annual_benefit') or profile.get('pension_annual_benefit') == 0
    ):
        questions.append(DiscoveryQuestion(
            id='pension',
            question="Do you have a pension or defined benefit plan from an employer?",
            question_type='Pension',
            suggestions=[
                {'label': 'Yes, about $20,000/year', 'value': {'pension_annual_benefit': 20000, 'pension_start_age': 65}},
                {'label': 'Yes, about $40,000/year', 'value': {'pension_annual_benefit': 40000, 'pension_start_age': 65}},
                {'label': 'No pension', 'value': {'pension_annual_benefit': 0}}
            ],
            priority=2
        ))

    # Check healthcare
    retirement_age = profile.get('retirement_age', 65)
    if 'healthcare' not in answered and retirement_age < 65 and (
        not profile.get('hc_pre_medicare_premium') or profile.get('hc_pre_medicare_premium') < 6000
    ):
        questions.append(DiscoveryQuestion(
            id='healthcare',
            question=f"Since you plan to retire at {retirement_age}, before Medicare eligibility at 65, have you budgeted for health insurance?",
            question_type='Healthcare',
            suggestions=[
                {'label': 'ACA marketplace plan (~$12k/yr)', 'value': {'hc_pre_medicare_premium': 12000, 'hc_pre_medicare_oop': 4000}},
                {'label': 'COBRA coverage (~$18k/yr)', 'value': {'hc_pre_medicare_premium': 18000, 'hc_pre_medicare_oop': 3000}},
                {'label': "Spouse's employer plan", 'value': {'hc_pre_medicare_premium': 6000, 'hc_pre_medicare_oop': 2000}},
                {'label': "I'll work until 65 for insurance", 'value': None}
            ],
            priority=1
        ))

    # Check risk tolerance
    if 'risk_tolerance' not in answered and profile.get('risk_tolerance') == 5:
        questions.append(DiscoveryQuestion(
            id='risk_tolerance',
            question="How would you describe your investment risk tolerance?",
            question_type='Risk Tolerance',
            suggestions=[
                {'label': 'Conservative (preserve capital)', 'value': {'risk_tolerance': 3}},
                {'label': 'Moderate (balanced growth)', 'value': {'risk_tolerance': 5}},
                {'label': 'Aggressive (maximum growth)', 'value': {'risk_tolerance': 8}}
            ],
            priority=3
        ))

    # Check employer match
    annual_income = profile.get('annual_income', 0)
    if 'employer_match' not in answered and annual_income > 50000 and (
        not profile.get('employer_match_percent') or profile.get('employer_match_percent') == 0
    ):
        questions.append(DiscoveryQuestion(
            id='employer_match',
            question="Does your employer offer a 401(k) match? This is free money you don't want to leave on the table!",
            question_type='Savings',
            suggestions=[
                {'label': 'Yes, 3% match', 'value': {'employer_match_percent': 3, 'employer_match_limit': 6000}},
                {'label': 'Yes, 6% match', 'value': {'employer_match_percent': 6, 'employer_match_limit': 12000}},
                {'label': 'No employer match', 'value': {'employer_match_percent': 0}},
                {'label': 'Self-employed / no 401k', 'value': None}
            ],
            priority=2
        ))

    # Generate insights
    insights = []
    current_age = profile.get('current_age', 35)
    current_savings = profile.get('current_savings', 0)
    monthly_contribution = profile.get('monthly_contribution', 0)

    years_to_retire = retirement_age - current_age
    if years_to_retire > 0:
        insights.append(f"You have {years_to_retire} years until retirement at age {retirement_age}.")

    if current_savings > 0 and annual_income > 0:
        savings_ratio = current_savings / annual_income
        if savings_ratio >= 3:
            insights.append(f"Your current savings of ${current_savings:,.0f} is {savings_ratio:.1f}x your annual income - a strong start!")
        else:
            insights.append(f"Your current savings of ${current_savings:,.0f} is {savings_ratio:.1f}x your annual income.")

    if monthly_contribution > 0 and annual_income > 0:
        savings_rate = (monthly_contribution * 12) / annual_income * 100
        insights.append(f"You're saving {savings_rate:.0f}% of your income annually (${monthly_contribution * 12:,.0f}/year).")

    # Generate recommendations
    recommendations = []
    if monthly_contribution > 0 and annual_income > 0:
        savings_rate = (monthly_contribution * 12) / annual_income
        if savings_rate < 0.15:
            recommendations.append(f"Consider increasing your savings rate from {savings_rate*100:.0f}% to 15-20% for a more secure retirement.")

    if years_to_retire > 20 and profile.get('risk_tolerance', 5) < 5:
        recommendations.append("With 20+ years to retirement, you may be able to tolerate more investment risk for higher growth potential.")

    if not recommendations:
        recommendations.append("Keep up your current savings trajectory and run a simulation to see your projected outcomes.")

    return DiscoveryResponse(
        questions=questions[:3],  # Limit to top 3 questions
        completeness_score=completeness_score,
        recommendations=recommendations,
        insights=insights
    )


@router.post("/discovery", response_model=DiscoveryResponse)
async def discovery_questions(request: DiscoveryRequest):
    """Generate personalized discovery questions based on profile gaps."""
    try:
        # Check for API key
        if not os.getenv("ANTHROPIC_API_KEY"):
            # Return mock response based on profile analysis
            return generate_mock_discovery(request)

        result = await discover_profile(request.profile, request.answered_questions)

        # Convert questions to DiscoveryQuestion models
        questions = [
            DiscoveryQuestion(**q) for q in result.get("questions", [])
        ]

        return DiscoveryResponse(
            questions=questions,
            completeness_score=result.get("completeness_score", 0.5),
            recommendations=result.get("recommendations", []),
            insights=result.get("insights", [])
        )

    except Exception as e:
        # Fallback to mock response on any error
        return generate_mock_discovery(request)
