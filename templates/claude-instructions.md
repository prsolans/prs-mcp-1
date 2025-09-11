# Claude Instructions for Contract Analysis Templates

## Template Selection Guidelines

### Use SHORT FORM Template When:
- User requests "summary" or "overview"
- Time-sensitive analysis is needed
- Focus is on immediate actions and decisions
- Executive-level briefing is required
- Portfolio-level insights across multiple contracts
- Quick strategic assessment is requested

### Use DETAILED Template When:
- User requests "comprehensive" or "detailed" analysis
- Full data extraction is needed
- Complete contract lifecycle analysis is required
- Structured metadata extraction is specifically requested
- Tabular data analysis is needed
- Deep strategic assessment is required

## Template Implementation Instructions

### 1. Always Start with Strategic Thinking
```xml
<thinking>
Before presenting any data, provide strategic narrative analysis that:
- Synthesizes the business context and strategic implications
- Explains the reasoning behind your analysis approach
- Identifies key patterns and their significance
- Provides strategic recommendations with rationale
- Connects contract details to broader business objectives

Avoid data dumps - focus on strategic synthesis and narrative reasoning.
</thinking>
```

### 2. Data Integration Guidelines
- **Short Form**: Present only the most critical data points with strategic context
- **Detailed Form**: Include comprehensive data extraction with business interpretation
- **Always**: Connect data points to business decisions and strategic implications
- **Never**: Present raw data without strategic context or business relevance

### 3. Narrative Focus Areas

#### For Individual Contracts:
- Business relationship context and strategic importance
- Risk assessment with impact on business operations
- Growth opportunities and value optimization potential
- Operational implications and resource requirements

#### For Portfolio Analysis:
- Cross-contract patterns and optimization opportunities
- Resource allocation recommendations
- Strategic alignment with business objectives
- Portfolio-level risk and opportunity assessment

### 4. Action Item Prioritization
- **Critical**: Immediate business impact, regulatory compliance, or risk mitigation
- **High**: Strategic value creation or significant operational improvement
- **Medium**: Process optimization or efficiency gains
- **Low**: Administrative or minor operational adjustments

### 5. Growth Opportunity Classification
- **Revenue Expansion**: Direct revenue growth potential
- **Operational Efficiency**: Cost reduction or process improvement
- **Strategic Partnerships**: Relationship deepening or market access
- **Risk Optimization**: Risk reduction without value sacrifice

## Quality Standards

### Thinking Section Requirements:
- Minimum 3-4 paragraphs of strategic narrative
- Focus on synthesis rather than data description
- Include business context and market implications
- Provide clear reasoning for recommendations
- Connect contract analysis to broader business strategy

### Data Presentation Standards:
- Every data point must include business significance
- Use tables for structured comparisons
- Highlight trends and variances with strategic interpretation
- Include validation status for extracted data
- Provide actionable insights from data analysis

### Communication Principles:
1. **Strategic First**: Lead with business implications
2. **Narrative Driven**: Use storytelling to convey insights
3. **Action Oriented**: Every insight should suggest next steps
4. **Contextual**: Connect contract details to business strategy
5. **Prioritized**: Clearly indicate importance and urgency

## Template Activation

To use these templates, Claude should:
1. Determine appropriate template based on user request
2. Reference the relevant template file for structure
3. Apply the strategic thinking approach outlined above
4. Follow the data integration and narrative guidelines
5. Ensure compliance with quality standards

Templates are located at:
- `templates/contract-analysis-short-form.md`
- `templates/contract-analysis-detailed.md`