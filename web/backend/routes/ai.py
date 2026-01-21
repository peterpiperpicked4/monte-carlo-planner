"""AI Analysis API routes."""
from fastapi import APIRouter, HTTPException
import os

from models import AnalyzeRequest, AnalyzeResponse, AIRecommendation
from services.claude import analyze_profile

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
