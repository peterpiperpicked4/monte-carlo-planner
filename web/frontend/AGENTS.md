# Monte Carlo Financial Planner - Agent Context

## Project Overview
A professional-grade Monte Carlo retirement simulation web app with React frontend and FastAPI backend. Features include multi-asset portfolio modeling, Social Security integration, healthcare cost projections, and AI-powered analysis.

## Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + Recharts
- **Backend**: FastAPI (Python 3.9+)
- **AI**: Anthropic Claude API
- **Styling**: Dark theme with emerald/gold/coral accent colors

## Key Directories
```
MONTE_CARLO/
├── web/
│   ├── frontend/           # React app (this directory)
│   │   ├── src/
│   │   │   ├── components/ # React components
│   │   │   ├── utils/      # Shared utilities (colors.js, format.js)
│   │   │   ├── App.jsx     # Main app
│   │   │   └── index.css   # Tailwind + custom styles
│   │   └── package.json
│   └── backend/
│       ├── app.py          # FastAPI entry
│       ├── models.py       # Pydantic models
│       ├── routes/
│       │   ├── simulate.py # Monte Carlo simulation
│       │   └── ai.py       # Claude AI endpoints
│       └── services/
│           ├── asset_classes.py    # Portfolio modeling
│           ├── financial_calcs.py  # SS, RMD, withdrawals
│           └── claude.py           # Claude API wrapper
└── monte_carlo/            # Core simulation engine (Python)
```

## Component Patterns

### Form Inputs
```jsx
// Use the existing Section component for collapsible sections
<Section title="Section Name" defaultOpen={false}>
  <InputField label="Label" name="field_name" value={formData.field} ... />
</Section>
```

### Colors
```jsx
import { CSS_COLORS, HEX_COLORS } from '../utils/colors';
// Use CSS_COLORS for CSS variables, HEX_COLORS for SVG
style={{ color: CSS_COLORS.emerald }}
```

### Backend Models
```python
# models.py - use Pydantic BaseModel
class NewModel(BaseModel):
    field: str = Field(default="value", description="Description")
```

## Running the App
- Frontend: `cd web/frontend && npm run dev` (port 1794)
- Backend: `cd web/backend && uvicorn app:app --reload` (port 8000)
- Both are already running in background tasks

## Current State
- Simulation works with Social Security, healthcare, pension integration
- Form has sections for: Profile, Income, Assets, Goals, SS, Healthcare, Pension, Simulation
- PercentileTable styled like Edward Jones
- AI analysis provides recommendations via Claude

## What Needs Building
1. Alternative Investments - wire existing model to simulation and add form UI
2. AI Discovery - conversational interface to help users complete their profile
