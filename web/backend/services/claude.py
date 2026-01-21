"""Claude AI integration service."""
import os
import json
import re
from typing import Dict, Any, List
from anthropic import Anthropic

from models import UserProfile, AIRecommendation


def get_client() -> Anthropic:
    """Get Anthropic client."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable not set")
    return Anthropic(api_key=api_key)


def format_currency(value: float) -> str:
    """Format number as currency."""
    if value >= 1_000_000:
        return f"${value / 1_000_000:.1f}M"
    elif value >= 1_000:
        return f"${value / 1_000:.0f}K"
    else:
        return f"${value:.0f}"


def build_analysis_prompt(profile: UserProfile, results: Dict[str, Any]) -> str:
    """Build prompt for Claude analysis."""
    success_prob = results.get("success_probability", 0) * 100

    prompt = f"""You are a financial planning advisor analyzing Monte Carlo simulation results for a client.

## Client Profile

**Personal Information:**
- Age: {profile.personal.current_age}
- Target Retirement Age: {profile.personal.retirement_age}
- Life Expectancy: {profile.personal.life_expectancy}
- State: {profile.personal.state}
- Filing Status: {profile.personal.filing_status.value}
- Risk Tolerance: {profile.personal.risk_tolerance}/10

**Income & Savings:**
- Annual Income: {format_currency(profile.income.annual_income)}
- Current Savings: {format_currency(profile.income.current_savings)}
- Monthly Contribution: {format_currency(profile.income.monthly_contribution)}
- Employer Match: {profile.income.employer_match_percent * 100}% (up to {format_currency(profile.income.employer_match_limit)})

**Assets & Debts:**
- Home Value: {format_currency(profile.assets.home_value)}
- Mortgage Balance: {format_currency(profile.assets.mortgage_balance)}
- Other Debts: {format_currency(profile.assets.other_debts)}
- Expected Inheritance: {format_currency(profile.assets.expected_inheritance)}

**Goals:**
- Retirement Income Goal: {format_currency(profile.goals.retirement_income_goal)}/year
- Legacy Goal: {format_currency(profile.goals.legacy_goal)}

## Simulation Results

- **Probability of Success: {success_prob:.1f}%**
- Confidence Zone: {results.get("confidence_zone", "unknown")}
- Number of Simulations: {results.get("num_simulations", 1000)}

**Statistics:**
- Mean Final Value: {format_currency(results.get("statistics", {}).get("mean", 0))}
- Median Final Value: {format_currency(results.get("statistics", {}).get("median", 0))}
- 5th Percentile: {format_currency(results.get("statistics", {}).get("var_95", 0))}
- 95th Percentile: {format_currency(results.get("percentiles", {}).get("p95", 0))}

## Your Task

Provide a comprehensive analysis with:

1. **Summary** (2-3 sentences): Overall assessment of their financial plan's health

2. **Recommendations** (3-5 specific, actionable items): Each should have:
   - A clear title
   - Description of what to do
   - Expected impact (high/medium/low)
   - Category (savings, retirement, risk, debt)

3. **Risk Assessment**: Brief paragraph on their risk profile and whether it's appropriate

Be specific, avoid generic advice. Reference their actual numbers. Be encouraging but honest.

Format your response as JSON:
```json
{{
  "summary": "...",
  "recommendations": [
    {{"title": "...", "description": "...", "impact": "high|medium|low", "category": "savings|retirement|risk|debt"}}
  ],
  "risk_assessment": "..."
}}
```"""

    return prompt


async def analyze_profile(
    profile: UserProfile,
    simulation_results: Dict[str, Any]
) -> Dict[str, Any]:
    """Analyze user profile and simulation results using Claude."""
    client = get_client()

    prompt = build_analysis_prompt(profile, simulation_results)

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    response_text = message.content[0].text

    # Extract JSON from response
    json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
    if json_match:
        json_str = json_match.group(1)
    else:
        # Try to parse the whole response as JSON
        json_str = response_text

    try:
        result = json.loads(json_str)
    except json.JSONDecodeError:
        # Fallback response
        result = {
            "summary": "Analysis could not be completed. Please try again.",
            "recommendations": [],
            "risk_assessment": "Unable to assess at this time."
        }

    return result


def build_discovery_prompt(profile: Dict[str, Any], answered_questions: List[str]) -> str:
    """Build prompt for Claude discovery analysis."""
    # Extract key profile info for context
    current_age = profile.get('current_age', 35)
    retirement_age = profile.get('retirement_age', 65)
    current_savings = profile.get('current_savings', 0)
    annual_income = profile.get('annual_income', 0)
    risk_tolerance = profile.get('risk_tolerance', 5)
    ss_benefit = profile.get('ss_benefit_at_fra', 0)
    pension_benefit = profile.get('pension_annual_benefit', 0)
    monthly_contribution = profile.get('monthly_contribution', 0)
    retirement_income_goal = profile.get('retirement_income_goal', 80000)

    prompt = f"""You are a financial planning assistant helping users complete their retirement profile through a conversational discovery process.

## Current User Profile

- Age: {current_age}
- Target Retirement Age: {retirement_age}
- Years to Retirement: {retirement_age - current_age}
- Current Savings: ${current_savings:,.0f}
- Annual Income: ${annual_income:,.0f}
- Monthly Contribution: ${monthly_contribution:,.0f}
- Risk Tolerance: {risk_tolerance}/10
- Social Security Benefit (at FRA): ${ss_benefit:,.0f}/month
- Pension Benefit: ${pension_benefit:,.0f}/year
- Retirement Income Goal: ${retirement_income_goal:,.0f}/year

## Questions Already Answered
{', '.join(answered_questions) if answered_questions else 'None yet'}

## Your Task

Analyze this profile and provide:

1. **Profile Completeness Score** (0-100%): How complete is their retirement profile?

2. **Top 3 Priority Questions**: What additional information would most improve their financial plan accuracy?
   Focus on areas like:
   - Social Security claiming strategy (if benefit > 0 but claiming age not optimized)
   - Healthcare costs (especially for early retirement before Medicare at 65)
   - Pension details (if they might have one)
   - Risk tolerance alignment with timeline
   - Savings rate optimization
   - Employer match maximization
   - Legacy/inheritance goals

3. **2-3 Personalized Insights**: What stands out about their financial situation? Be specific with numbers.

4. **2-3 Actionable Recommendations**: Based on what you know, what should they focus on?

Format as JSON:
```json
{{
  "completeness_score": 0.75,
  "questions": [
    {{
      "id": "unique_id",
      "question": "Question text",
      "question_type": "Category",
      "suggestions": [
        {{"label": "Answer option", "value": {{"field": "value"}} }},
        {{"label": "Another option", "value": {{"field": "value"}} }}
      ],
      "priority": 1
    }}
  ],
  "insights": [
    "Specific insight about their situation..."
  ],
  "recommendations": [
    "Actionable recommendation..."
  ]
}}
```

Be specific and reference their actual numbers. Question suggestions should have values that can be directly applied to update their profile."""

    return prompt


async def discover_profile(
    profile: Dict[str, Any],
    answered_questions: List[str]
) -> Dict[str, Any]:
    """Analyze user profile and generate discovery questions using Claude."""
    client = get_client()

    prompt = build_discovery_prompt(profile, answered_questions)

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    response_text = message.content[0].text

    # Extract JSON from response
    json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
    if json_match:
        json_str = json_match.group(1)
    else:
        # Try to parse the whole response as JSON
        json_str = response_text

    try:
        result = json.loads(json_str)
    except json.JSONDecodeError:
        # Fallback response
        result = {
            "completeness_score": 0.5,
            "questions": [],
            "insights": ["Unable to analyze profile at this time."],
            "recommendations": ["Please try again or use the form to enter your information."]
        }

    return result
