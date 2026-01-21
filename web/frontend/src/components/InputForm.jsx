import React, { useState, useId } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

const Section = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const sectionId = useId();
  const titleId = `${sectionId}-title`;
  const contentId = `${sectionId}-content`;

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-0 py-4 flex items-center justify-between hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)] rounded"
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <span
          id={titleId}
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          {title}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
        )}
      </button>
      <div
        id={contentId}
        role="region"
        aria-labelledby={titleId}
        hidden={!isOpen}
        className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100 pb-6' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="space-y-4">{children}</div>
        </div>
      </div>
    </div>
  );
};

const InputField = ({ label, name, value, onChange, onBlur, prefix, suffix, min, max, step, isNumeric = true, error }) => {
  const inputId = `input-${name}`;
  const errorId = `${inputId}-error`;

  // Format number with commas for display (for currency fields)
  const formatDisplayValue = (val) => {
    if (val === '' || val === undefined || val === null) return '';
    // For currency fields (prefix=$), format with commas
    if (prefix === '$' && typeof val === 'number') {
      return val.toLocaleString('en-US');
    }
    return String(val);
  };

  return (
    <div>
      <label htmlFor={inputId} className="input-label">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-mono text-sm" aria-hidden="true">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          type="text"
          inputMode={isNumeric ? "decimal" : "text"}
          name={name}
          value={formatDisplayValue(value)}
          onChange={onChange}
          onBlur={onBlur}
          className={`input-field ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-10' : ''} ${error ? 'border-[var(--coral)] focus:border-[var(--coral)]' : ''}`}
          aria-describedby={error ? errorId : (prefix || suffix ? `${inputId}-hint` : undefined)}
          aria-invalid={error ? 'true' : undefined}
          autoComplete="off"
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-mono text-sm" aria-hidden="true">
            {suffix}
          </span>
        )}
        {(prefix || suffix) && (
          <span id={`${inputId}-hint`} className="sr-only">
            {prefix && `Value in ${prefix === '$' ? 'dollars' : prefix}`}
            {suffix && `Value in ${suffix === '%' ? 'percent' : suffix}`}
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-xs text-[var(--coral)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

const SelectField = ({ label, name, value, onChange, options }) => {
  const selectId = `select-${name}`;
  return (
    <div>
      <label htmlFor={selectId} className="input-label">{label}</label>
      <select id={selectId} name={name} value={value} onChange={onChange} className="input-field cursor-pointer">
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
};

const STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' }
];

const INVESTMENT_TYPES = [
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'private_equity', label: 'Private Equity' },
  { value: 'hedge_fund', label: 'Hedge Fund' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'annuity', label: 'Annuity' },
  { value: 'other', label: 'Other' }
];

export default function InputForm({ onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    current_age: 35,
    retirement_age: 65,
    life_expectancy: 90,
    state: 'CA',
    filing_status: 'single',
    risk_tolerance: 5,
    annual_income: 100000,
    income_growth_rate: 3,
    current_savings: 150000,
    monthly_contribution: 1500,
    employer_match_percent: 3,
    employer_match_limit: 6000,
    home_value: 500000,
    mortgage_balance: 350000,
    other_real_estate: 0,
    vehicles_value: 30000,
    other_debts: 15000,
    expected_inheritance: 0,
    inheritance_year: 2050,
    retirement_income_goal: 80000,
    legacy_goal: 100000,
    num_simulations: 1000,
    // Social Security
    ss_benefit_at_fra: 2500,
    ss_birth_year: 1990,
    ss_claiming_age: 67,
    ss_spouse_benefit: 0,
    ss_spouse_claiming_age: 67,
    // Healthcare
    hc_pre_medicare_premium: 12000,
    hc_pre_medicare_oop: 3000,
    hc_medicare_part_b: 175,
    hc_medicare_supplement: 200,
    hc_medicare_part_d: 35,
    hc_medicare_oop: 5000,
    // Pension
    pension_annual_benefit: 0,
    pension_start_age: 65,
    pension_has_cola: false,
    // Alternative Investments
    alternative_investments: []
  });

  const [errors, setErrors] = useState({});

  // Validate a single field and update errors state
  const validateField = (name, value, allData = formData) => {
    const data = { ...allData, [name]: value };
    let error = null;

    // Age validations
    if (name === 'current_age') {
      if (value < 0) error = 'Age cannot be negative';
      else if (value < 18) error = 'Must be at least 18';
      else if (value > 100) error = 'Must be 100 or less';
      else if (value >= data.retirement_age) error = 'Must be less than retirement age';
    }

    if (name === 'retirement_age') {
      if (value < 0) error = 'Age cannot be negative';
      else if (value <= data.current_age) error = 'Must be greater than current age';
      else if (value > data.life_expectancy) error = 'Must be less than life expectancy';
    }

    if (name === 'life_expectancy') {
      if (value < 0) error = 'Age cannot be negative';
      else if (value <= data.retirement_age) error = 'Must be greater than retirement age';
      else if (value > 120) error = 'Must be 120 or less';
    }

    // Financial field validations - no negative values
    const financialFields = [
      'annual_income', 'current_savings', 'monthly_contribution',
      'employer_match_limit', 'home_value', 'mortgage_balance',
      'other_debts', 'expected_inheritance', 'retirement_income_goal', 'legacy_goal'
    ];

    if (financialFields.includes(name) && value < 0) {
      error = 'Cannot be negative';
    }

    // Percentage validations
    if (name === 'income_growth_rate' && (value < 0 || value > 20)) {
      error = 'Must be between 0% and 20%';
    }

    if (name === 'employer_match_percent' && (value < 0 || value > 100)) {
      error = 'Must be between 0% and 100%';
    }

    return error;
  };

  // Validate all fields and return whether form is valid
  const validateForm = () => {
    const newErrors = {};
    const fieldsToValidate = [
      'current_age', 'retirement_age', 'life_expectancy',
      'annual_income', 'income_growth_rate', 'current_savings',
      'monthly_contribution', 'employer_match_percent', 'employer_match_limit',
      'home_value', 'mortgage_balance', 'other_debts', 'expected_inheritance',
      'retirement_income_goal', 'legacy_goal'
    ];

    fieldsToValidate.forEach(field => {
      const error = validateField(field, formData[field], formData);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes - allow free typing
  const handleChange = (e) => {
    const { name, value } = e.target;

    // For select fields, use value directly
    if (e.target.tagName === 'SELECT') {
      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }

    // For text/numeric inputs, store the raw value (remove commas for parsing later)
    const cleanValue = value.replace(/,/g, '');

    // Allow empty string, or valid number characters
    if (cleanValue === '' || cleanValue === '-' || /^-?\d*\.?\d*$/.test(cleanValue)) {
      setFormData(prev => ({
        ...prev,
        [name]: cleanValue === '' ? '' : cleanValue
      }));
    }
  };

  // Handle blur - validate and format the final value
  const handleBlur = (e) => {
    const { name, value } = e.target;
    const cleanValue = String(value).replace(/,/g, '');

    // Parse to number, default to 0 if empty/invalid
    let numValue = parseFloat(cleanValue);
    if (isNaN(numValue)) {
      numValue = 0;
    }

    // Round to integer for age fields
    if (['current_age', 'retirement_age', 'life_expectancy'].includes(name)) {
      numValue = Math.round(numValue);
    }

    // Update the form data
    setFormData(prev => {
      const newData = { ...prev, [name]: numValue };

      // Run validation for this field and related fields
      const newErrors = { ...errors };

      // Validate the current field
      const error = validateField(name, numValue, newData);
      if (error) {
        newErrors[name] = error;
      } else {
        delete newErrors[name];
      }

      // For age fields, also re-validate related age fields
      if (['current_age', 'retirement_age', 'life_expectancy'].includes(name)) {
        ['current_age', 'retirement_age', 'life_expectancy'].forEach(field => {
          if (field !== name) {
            const relatedError = validateField(field, newData[field], newData);
            if (relatedError) {
              newErrors[field] = relatedError;
            } else {
              delete newErrors[field];
            }
          }
        });
      }

      setErrors(newErrors);
      return newData;
    });
  };

  // Alternative Investment handlers
  const addAlternativeInvestment = () => {
    setFormData(prev => ({
      ...prev,
      alternative_investments: [
        ...prev.alternative_investments,
        {
          id: Date.now(),
          name: '',
          investment_type: 'real_estate',
          current_value: 0,
          expected_return: 7
        }
      ]
    }));
  };

  const removeAlternativeInvestment = (id) => {
    setFormData(prev => ({
      ...prev,
      alternative_investments: prev.alternative_investments.filter(inv => inv.id !== id)
    }));
  };

  const updateAlternativeInvestment = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      alternative_investments: prev.alternative_investments.map(inv =>
        inv.id === id ? { ...inv, [field]: value } : inv
      )
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    const payload = {
      profile: {
        personal: {
          current_age: formData.current_age,
          retirement_age: formData.retirement_age,
          life_expectancy: formData.life_expectancy,
          state: formData.state,
          filing_status: formData.filing_status,
          risk_tolerance: formData.risk_tolerance
        },
        income: {
          annual_income: formData.annual_income,
          income_growth_rate: formData.income_growth_rate / 100,
          current_savings: formData.current_savings,
          monthly_contribution: formData.monthly_contribution,
          employer_match_percent: formData.employer_match_percent / 100,
          employer_match_limit: formData.employer_match_limit
        },
        assets: {
          home_value: formData.home_value,
          mortgage_balance: formData.mortgage_balance,
          other_real_estate: formData.other_real_estate,
          vehicles_value: formData.vehicles_value,
          other_debts: formData.other_debts,
          expected_inheritance: formData.expected_inheritance,
          inheritance_year: formData.inheritance_year
        },
        goals: {
          retirement_income_goal: formData.retirement_income_goal,
          legacy_goal: formData.legacy_goal,
          life_events: []
        },
        // Social Security (only include if benefit > 0)
        social_security: formData.ss_benefit_at_fra > 0 ? {
          estimated_benefit_at_fra: formData.ss_benefit_at_fra,
          birth_year: formData.ss_birth_year,
          claiming_age: parseInt(formData.ss_claiming_age, 10),
          spouse_benefit_at_fra: formData.ss_spouse_benefit || 0,
          spouse_claiming_age: parseInt(formData.ss_spouse_claiming_age, 10) || 67,
          cola_assumption: 0.02
        } : null,
        // Healthcare costs
        healthcare: {
          annual_premium_pre_medicare: formData.hc_pre_medicare_premium,
          annual_out_of_pocket_pre_medicare: formData.hc_pre_medicare_oop,
          medicare_part_b_premium: formData.hc_medicare_part_b,
          medicare_supplement_premium: formData.hc_medicare_supplement,
          medicare_part_d_premium: formData.hc_medicare_part_d,
          annual_out_of_pocket_medicare: formData.hc_medicare_oop,
          healthcare_inflation_rate: 0.05
        },
        // Pension (only include if benefit > 0)
        pension: formData.pension_annual_benefit > 0 ? {
          annual_benefit: formData.pension_annual_benefit,
          start_age: formData.pension_start_age,
          has_cola: formData.pension_has_cola,
          cola_rate: 0.02
        } : null,
        // Alternative Investments
        alternative_investments: formData.alternative_investments.map(inv => ({
          name: inv.name || 'Unnamed Investment',
          investment_type: inv.investment_type,
          current_value: inv.current_value || 0,
          expected_return: (inv.expected_return || 7) / 100,
          volatility: 0.15,
          liquidity: 'medium'
        }))
      },
      params: {
        num_simulations: formData.num_simulations,
        inflation_rate: 0.025
      }
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Section title="Profile">
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Current Age"
            name="current_age"
            value={formData.current_age}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.current_age}
          />
          <InputField
            label="Retire At"
            name="retirement_age"
            value={formData.retirement_age}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.retirement_age}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Life Expectancy"
            name="life_expectancy"
            value={formData.life_expectancy}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.life_expectancy}
          />
          <SelectField
            label="State"
            name="state"
            value={formData.state}
            onChange={handleChange}
            options={STATES}
          />
        </div>
        <div>
          <label htmlFor="input-risk_tolerance" className="input-label">Risk Tolerance</label>
          <div className="pt-2">
            <input
              id="input-risk_tolerance"
              type="range"
              name="risk_tolerance"
              min="1"
              max="10"
              value={formData.risk_tolerance || 5}
              onChange={(e) => setFormData(prev => ({ ...prev, risk_tolerance: parseInt(e.target.value, 10) }))}
              className="w-full"
              aria-valuemin={1}
              aria-valuemax={10}
              aria-valuenow={formData.risk_tolerance || 5}
              aria-valuetext={`${formData.risk_tolerance || 5} out of 10, ${(formData.risk_tolerance || 5) <= 3 ? 'Conservative' : (formData.risk_tolerance || 5) <= 7 ? 'Moderate' : 'Aggressive'}`}
            />
            <div className="flex justify-between text-xs mt-2" style={{ color: 'var(--text-muted)' }} aria-hidden="true">
              <span>Conservative</span>
              <span className="font-mono text-[var(--emerald)] font-semibold">{formData.risk_tolerance || 5}</span>
              <span>Aggressive</span>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Income & Savings">
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Annual Income"
            name="annual_income"
            value={formData.annual_income}
            onChange={handleChange}
            onBlur={handleBlur}
            prefix="$"
            error={errors.annual_income}
          />
          <InputField
            label="Growth Rate"
            name="income_growth_rate"
            value={formData.income_growth_rate}
            onChange={handleChange}
            onBlur={handleBlur}
            suffix="%"
            error={errors.income_growth_rate}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Current Savings"
            name="current_savings"
            value={formData.current_savings}
            onChange={handleChange}
            onBlur={handleBlur}
            prefix="$"
            error={errors.current_savings}
          />
          <InputField
            label="Monthly Contrib."
            name="monthly_contribution"
            value={formData.monthly_contribution}
            onChange={handleChange}
            onBlur={handleBlur}
            prefix="$"
            error={errors.monthly_contribution}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Employer Match"
            name="employer_match_percent"
            value={formData.employer_match_percent}
            onChange={handleChange}
            onBlur={handleBlur}
            suffix="%"
            error={errors.employer_match_percent}
          />
          <InputField
            label="Match Limit"
            name="employer_match_limit"
            value={formData.employer_match_limit}
            onChange={handleChange}
            onBlur={handleBlur}
            prefix="$"
            error={errors.employer_match_limit}
          />
        </div>
      </Section>

      <Section title="Assets & Debts" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Home Value"
            name="home_value"
            value={formData.home_value}
            onChange={handleChange}
            onBlur={handleBlur}
            prefix="$"
            error={errors.home_value}
          />
          <InputField
            label="Mortgage"
            name="mortgage_balance"
            value={formData.mortgage_balance}
            onChange={handleChange}
            onBlur={handleBlur}
            prefix="$"
            error={errors.mortgage_balance}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Other Debts"
            name="other_debts"
            value={formData.other_debts}
            onChange={handleChange}
            onBlur={handleBlur}
            prefix="$"
            error={errors.other_debts}
          />
          <InputField
            label="Inheritance"
            name="expected_inheritance"
            value={formData.expected_inheritance}
            onChange={handleChange}
            onBlur={handleBlur}
            prefix="$"
            error={errors.expected_inheritance}
          />
        </div>
      </Section>

      <Section title="Goals" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Retirement Income"
            name="retirement_income_goal"
            value={formData.retirement_income_goal}
            onChange={handleChange}
            onBlur={handleBlur}
            prefix="$"
            error={errors.retirement_income_goal}
          />
          <InputField
            label="Legacy Goal"
            name="legacy_goal"
            value={formData.legacy_goal}
            onChange={handleChange}
            onBlur={handleBlur}
            prefix="$"
            error={errors.legacy_goal}
          />
        </div>
      </Section>

      <Section title="Social Security" defaultOpen={false}>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Enter your estimated benefit from ssa.gov. Leave at $0 if none.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Monthly Benefit (FRA)"
            name="ss_benefit_at_fra"
            value={formData.ss_benefit_at_fra}
            onChange={handleChange}
            onBlur={handleBlur}
            prefix="$"
          />
          <InputField
            label="Birth Year"
            name="ss_birth_year"
            value={formData.ss_birth_year}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Claiming Age"
            name="ss_claiming_age"
            value={formData.ss_claiming_age}
            onChange={handleChange}
            options={[
              { value: 62, label: '62 (Early - reduced)' },
              { value: 63, label: '63' },
              { value: 64, label: '64' },
              { value: 65, label: '65' },
              { value: 66, label: '66' },
              { value: 67, label: '67 (FRA)' },
              { value: 68, label: '68' },
              { value: 69, label: '69' },
              { value: 70, label: '70 (Maximum)' }
            ]}
          />
          <InputField
            label="Spouse Benefit"
            name="ss_spouse_benefit"
            value={formData.ss_spouse_benefit}
            onChange={handleChange}
            onBlur={handleBlur}
            prefix="$"
          />
        </div>
      </Section>

      <Section title="Healthcare Costs" defaultOpen={false}>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Estimated annual healthcare costs. Pre-Medicare until age 65.
        </p>
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Pre-Medicare (Before 65)
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Annual Premium"
              name="hc_pre_medicare_premium"
              value={formData.hc_pre_medicare_premium}
              onChange={handleChange}
              onBlur={handleBlur}
              prefix="$"
            />
            <InputField
              label="Out-of-Pocket"
              name="hc_pre_medicare_oop"
              value={formData.hc_pre_medicare_oop}
              onChange={handleChange}
              onBlur={handleBlur}
              prefix="$"
            />
          </div>
        </div>
        <div className="space-y-3 mt-4">
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Medicare (65+)
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Part B (Monthly)"
              name="hc_medicare_part_b"
              value={formData.hc_medicare_part_b}
              onChange={handleChange}
              onBlur={handleBlur}
              prefix="$"
            />
            <InputField
              label="Supplement (Monthly)"
              name="hc_medicare_supplement"
              value={formData.hc_medicare_supplement}
              onChange={handleChange}
              onBlur={handleBlur}
              prefix="$"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Part D (Monthly)"
              name="hc_medicare_part_d"
              value={formData.hc_medicare_part_d}
              onChange={handleChange}
              onBlur={handleBlur}
              prefix="$"
            />
            <InputField
              label="Annual Out-of-Pocket"
              name="hc_medicare_oop"
              value={formData.hc_medicare_oop}
              onChange={handleChange}
              onBlur={handleBlur}
              prefix="$"
            />
          </div>
        </div>
      </Section>

      <Section title="Pension" defaultOpen={false}>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Defined benefit pension. Leave at $0 if none.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Annual Benefit"
            name="pension_annual_benefit"
            value={formData.pension_annual_benefit}
            onChange={handleChange}
            onBlur={handleBlur}
            prefix="$"
          />
          <InputField
            label="Start Age"
            name="pension_start_age"
            value={formData.pension_start_age}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </div>
        <div className="mt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.pension_has_cola}
              onChange={(e) => setFormData(prev => ({ ...prev, pension_has_cola: e.target.checked }))}
              className="w-4 h-4 rounded border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--emerald)] focus:ring-[var(--emerald)]"
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Includes cost-of-living adjustment (COLA)
            </span>
          </label>
        </div>
      </Section>

      <Section title="Alternative Investments" defaultOpen={false}>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Add real estate, crypto, private equity, or other alternative investments.
        </p>

        {formData.alternative_investments.map((investment, index) => (
          <div
            key={investment.id}
            className="p-3 mb-3 rounded-lg border"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Investment {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeAlternativeInvestment(investment.id)}
                className="p-1 rounded hover:bg-[var(--coral)] hover:bg-opacity-20 transition-colors"
                style={{ color: 'var(--coral)' }}
                aria-label={`Remove investment ${index + 1}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="input-label">Name</label>
                <input
                  type="text"
                  value={investment.name}
                  onChange={(e) => updateAlternativeInvestment(investment.id, 'name', e.target.value)}
                  placeholder="e.g., Rental Property"
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">Type</label>
                <select
                  value={investment.investment_type}
                  onChange={(e) => updateAlternativeInvestment(investment.id, 'investment_type', e.target.value)}
                  className="input-field cursor-pointer"
                >
                  {INVESTMENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Current Value</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-mono text-sm">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={investment.current_value ? investment.current_value.toLocaleString('en-US') : ''}
                    onChange={(e) => {
                      const cleanValue = e.target.value.replace(/,/g, '');
                      const numValue = parseFloat(cleanValue) || 0;
                      updateAlternativeInvestment(investment.id, 'current_value', numValue);
                    }}
                    className="input-field pl-8"
                  />
                </div>
              </div>
              <div>
                <label className="input-label">Expected Return</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={investment.expected_return}
                    onChange={(e) => {
                      const numValue = parseFloat(e.target.value) || 0;
                      updateAlternativeInvestment(investment.id, 'expected_return', numValue);
                    }}
                    className="input-field pr-10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-mono text-sm">%</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addAlternativeInvestment}
          className="w-full py-2 px-4 rounded-lg border border-dashed flex items-center justify-center gap-2 transition-colors hover:border-[var(--emerald)] hover:text-[var(--emerald)]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Add Investment</span>
        </button>
      </Section>

      <Section title="Simulation" defaultOpen={false}>
        <SelectField
          label="Number of Trials"
          name="num_simulations"
          value={formData.num_simulations}
          onChange={handleChange}
          options={[
            { value: 500, label: '500 trials' },
            { value: 1000, label: '1,000 trials' },
            { value: 5000, label: '5,000 trials' },
            { value: 10000, label: '10,000 trials' }
          ]}
        />
      </Section>

      <div className="pt-6">
        {Object.keys(errors).length > 0 && (
          <div
            className="mb-4 p-3 rounded-lg border text-sm"
            style={{
              background: 'rgba(248, 113, 113, 0.1)',
              borderColor: 'rgba(248, 113, 113, 0.3)',
              color: 'var(--coral)'
            }}
            role="alert"
          >
            Please fix the highlighted fields before running the simulation.
          </div>
        )}
        <button
          type="submit"
          disabled={isLoading || Object.keys(errors).length > 0}
          className="w-full btn-primary flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-busy={isLoading}
        >
          {isLoading ? (
            <span role="status" className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Simulating...</span>
              <span className="sr-only">Running simulation, please wait</span>
            </span>
          ) : (
            'Run Simulation'
          )}
        </button>
      </div>
    </form>
  );
}
