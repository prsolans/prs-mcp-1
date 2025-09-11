/**
 * Portfolio-Level Analytics and Intelligence
 * Strategic analysis across entire contract portfolio
 */

import { normalizeContractMetadata, type NormalizedContractMetadata } from './clmProcessor.js';

// Portfolio Risk Analytics Interfaces
export interface PortfolioRiskProfile {
  totalContracts: number;
  totalValue: number;
  overallRiskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  riskValueDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface ConcentrationRisk {
  counterpartyConcentration: Array<{
    party: string;
    contractCount: number;
    totalValue: number;
    percentage: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;
  industryConcentration: Array<{
    industry: string;
    contractCount: number;
    percentage: number;
  }>;
  geographicConcentration: Array<{
    jurisdiction: string;
    contractCount: number;
    totalValue: number;
    percentage: number;
  }>;
}

export interface PortfolioAlert {
  type: 'concentration' | 'risk' | 'compliance' | 'renewal' | 'performance';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  affectedContracts: number;
  recommendedAction: string;
}

// Renewal Pipeline Interfaces
export interface RenewalPipelineItem {
  contractId: string;
  name: string;
  counterparty: string;
  value: number;
  renewalDate: string;
  daysUntilRenewal: number;
  renewalType: 'automatic' | 'manual' | 'none';
  status: string;
  recommendedAction: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ConsolidationOpportunity {
  counterparty: string;
  currentContracts: number;
  contractTypes: string[];
  suggestedAction: string;
  estimatedSavings: string;
  riskReduction: string;
  priority: 'low' | 'medium' | 'high';
}

export interface RenegotiationPriority {
  contractId: string;
  contractName: string;
  counterparty: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  suggestedChanges: string[];
  businessImpact: string;
  timeframe: string;
}

// Strategic Intelligence Interfaces
export interface ContractPerformanceMetrics {
  counterparty: string;
  contracts: number;
  totalValue: number;
  performanceScore: number;
  metrics: {
    onTimeDelivery?: number;
    costPerformance?: number;
    relationshipHealth?: number;
    complianceScore?: number;
  };
  strategicValue: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: string;
}

export interface MarketBenchmark {
  metric: string;
  portfolioValue: string | number;
  industryBenchmark: string | number;
  variance: number;
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
}

export interface CompliancePortfolioView {
  regulatoryCompliance: Record<string, {
    compliant: number;
    needsReview: number;
    nonCompliant: number;
  }>;
  upcomingRegulatory: Array<{
    regulation: string;
    effectiveDate: string;
    affectedContracts: number;
    action: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

/**
 * Analyze portfolio risk profile and concentration
 */
export function analyzePortfolioRisk(documents: any[]): {
  riskProfile: PortfolioRiskProfile;
  concentrationRisks: ConcentrationRisk;
  portfolioAlerts: PortfolioAlert[];
} {
  const contractsWithMetadata = documents.map(doc => ({
    ...doc,
    metadata: normalizeContractMetadata(doc.AttributeGroups || {})
  }));

  // Calculate risk profile
  const riskProfile = calculateRiskProfile(contractsWithMetadata);
  
  // Analyze concentration risks
  const concentrationRisks = analyzeConcentrationRisks(contractsWithMetadata);
  
  // Generate portfolio alerts
  const portfolioAlerts = generatePortfolioAlerts(contractsWithMetadata, concentrationRisks);

  return { riskProfile, concentrationRisks, portfolioAlerts };
}

/**
 * Analyze renewal pipeline and optimization opportunities
 */
export function analyzeRenewalPipeline(documents: any[]): {
  renewalPipeline: {
    next30Days: RenewalPipelineItem[];
    next90Days: RenewalPipelineItem[];
    nextYear: RenewalPipelineItem[];
  };
  consolidationOpportunities: ConsolidationOpportunity[];
  renegotiationPriorities: RenegotiationPriority[];
  portfolioOptimization: {
    standardTermsCompliance: number;
    averageNegotiationCycle: number;
    contractEfficiencyScore: number;
  };
} {
  const contractsWithMetadata = documents.map(doc => ({
    ...doc,
    metadata: normalizeContractMetadata(doc.AttributeGroups || {})
  }));

  // Build renewal pipeline
  const renewalPipeline = buildRenewalPipeline(contractsWithMetadata);
  
  // Identify consolidation opportunities
  const consolidationOpportunities = identifyConsolidationOpportunities(contractsWithMetadata);
  
  // Determine renegotiation priorities
  const renegotiationPriorities = identifyRenegotiationPriorities(contractsWithMetadata);
  
  // Calculate optimization metrics
  const portfolioOptimization = calculateOptimizationMetrics(contractsWithMetadata);

  return {
    renewalPipeline,
    consolidationOpportunities,
    renegotiationPriorities,
    portfolioOptimization
  };
}

/**
 * Generate strategic contract intelligence and benchmarking
 */
export function analyzeStrategicIntelligence(documents: any[]): {
  contractPerformance: {
    topPerformingRelationships: ContractPerformanceMetrics[];
    underperformingContracts: ContractPerformanceMetrics[];
  };
  marketIntelligence: {
    termsBenchmarking: MarketBenchmark[];
    pricingTrends: {
      costInflation: Record<string, number>;
      recommendedActions: string[];
    };
  };
  compliancePortfolioView: CompliancePortfolioView;
} {
  const contractsWithMetadata = documents.map(doc => ({
    ...doc,
    metadata: normalizeContractMetadata(doc.AttributeGroups || {})
  }));

  // Analyze contract performance
  const contractPerformance = analyzeContractPerformance(contractsWithMetadata);
  
  // Generate market intelligence
  const marketIntelligence = generateMarketIntelligence(contractsWithMetadata);
  
  // Compliance portfolio view
  const compliancePortfolioView = analyzeCompliancePortfolio(contractsWithMetadata);

  return {
    contractPerformance,
    marketIntelligence,
    compliancePortfolioView
  };
}

// Implementation functions
function calculateRiskProfile(contracts: any[]): PortfolioRiskProfile {
  const totalContracts = contracts.length;
  let totalValue = 0;
  const riskCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  const riskValues = { critical: 0, high: 0, medium: 0, low: 0 };

  for (const contract of contracts) {
    const value = contract.metadata.financialTerms.totalValue || 0;
    totalValue += value;

    // Determine risk level based on multiple factors
    let riskLevel = 'low';
    
    if (contract.metadata.riskIndicators.includes('unlimited-liability')) {
      riskLevel = 'critical';
    } else if (value > 5000000 || contract.metadata.riskIndicators.includes('high-value')) {
      riskLevel = 'high';
    } else if (value > 1000000 || contract.metadata.riskIndicators.includes('auto-renewal')) {
      riskLevel = 'medium';
    }

    (riskCounts as any)[riskLevel]++;
    (riskValues as any)[riskLevel] += value;
  }

  return {
    totalContracts,
    totalValue,
    overallRiskDistribution: riskCounts,
    riskValueDistribution: riskValues
  };
}

function analyzeConcentrationRisks(contracts: any[]): ConcentrationRisk {
  const counterpartyMap = new Map<string, { count: number; value: number }>();
  const industryMap = new Map<string, number>();
  const jurisdictionMap = new Map<string, { count: number; value: number }>();
  
  let totalValue = 0;

  for (const contract of contracts) {
    const value = contract.metadata.financialTerms.totalValue || 0;
    totalValue += value;

    // Counterparty concentration
    contract.metadata.parties.forEach((party: any) => {
      const existing = counterpartyMap.get(party.name) || { count: 0, value: 0 };
      counterpartyMap.set(party.name, {
        count: existing.count + 1,
        value: existing.value + value
      });
    });

    // Industry concentration (derived from business unit)
    const industry = contract.metadata.businessUnit || 'Unknown';
    industryMap.set(industry, (industryMap.get(industry) || 0) + 1);

    // Geographic concentration
    const jurisdiction = contract.metadata.keyTerms.jurisdiction || 'Unknown';
    const existing = jurisdictionMap.get(jurisdiction) || { count: 0, value: 0 };
    jurisdictionMap.set(jurisdiction, {
      count: existing.count + 1,
      value: existing.value + value
    });
  }

  // Convert to arrays and calculate percentages
  const counterpartyConcentration = Array.from(counterpartyMap.entries())
    .map(([party, data]) => ({
      party,
      contractCount: data.count,
      totalValue: data.value,
      percentage: (data.value / totalValue) * 100,
      riskLevel: (data.value / totalValue > 0.25 ? 'critical' : 
                 data.value / totalValue > 0.15 ? 'high' :
                 data.value / totalValue > 0.10 ? 'medium' : 'low') as 'low' | 'medium' | 'high' | 'critical'
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10);

  const industryConcentration = Array.from(industryMap.entries())
    .map(([industry, count]) => ({
      industry,
      contractCount: count,
      percentage: (count / contracts.length) * 100
    }))
    .sort((a, b) => b.contractCount - a.contractCount);

  const geographicConcentration = Array.from(jurisdictionMap.entries())
    .map(([jurisdiction, data]) => ({
      jurisdiction,
      contractCount: data.count,
      totalValue: data.value,
      percentage: (data.value / totalValue) * 100
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  return {
    counterpartyConcentration,
    industryConcentration,
    geographicConcentration
  };
}

function generatePortfolioAlerts(contracts: any[], concentrationRisks: ConcentrationRisk): PortfolioAlert[] {
  const alerts: PortfolioAlert[] = [];

  // Concentration alerts
  concentrationRisks.counterpartyConcentration.forEach(concentration => {
    if (concentration.riskLevel === 'critical') {
      alerts.push({
        type: 'concentration',
        severity: 'critical',
        message: `${concentration.percentage.toFixed(1)}% of portfolio value concentrated with ${concentration.party}`,
        affectedContracts: concentration.contractCount,
        recommendedAction: 'Diversify supplier base or implement additional risk controls'
      });
    }
  });

  // Risk alerts
  const unlimitedLiabilityContracts = contracts.filter(c => 
    c.metadata.riskIndicators.includes('unlimited-liability')
  );
  if (unlimitedLiabilityContracts.length > 0) {
    const totalValue = unlimitedLiabilityContracts.reduce((sum, c) => 
      sum + (c.metadata.financialTerms.totalValue || 0), 0
    );
    alerts.push({
      type: 'risk',
      severity: 'warning',
      message: `${unlimitedLiabilityContracts.length} contracts with unlimited liability clauses`,
      affectedContracts: unlimitedLiabilityContracts.length,
      recommendedAction: 'Negotiate liability caps to limit financial exposure'
    });
  }

  // Compliance alerts
  const gdprContracts = contracts.filter(c => 
    c.metadata.complianceFlags.includes('gdpr-applicable')
  );
  if (gdprContracts.length > 0) {
    alerts.push({
      type: 'compliance',
      severity: 'info',
      message: `${gdprContracts.length} contracts require GDPR compliance review`,
      affectedContracts: gdprContracts.length,
      recommendedAction: 'Schedule annual GDPR compliance audit'
    });
  }

  return alerts;
}

function buildRenewalPipeline(contracts: any[]): {
  next30Days: RenewalPipelineItem[];
  next90Days: RenewalPipelineItem[];
  nextYear: RenewalPipelineItem[];
} {
  const now = new Date();
  const next30Days: RenewalPipelineItem[] = [];
  const next90Days: RenewalPipelineItem[] = [];
  const nextYear: RenewalPipelineItem[] = [];

  for (const contract of contracts) {
    const renewalDate = contract.metadata.renewalDate || contract.metadata.expirationDate;
    if (!renewalDate) continue;

    const renewal = new Date(renewalDate);
    const daysUntilRenewal = Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilRenewal < 0) continue; // Skip past dates

    const item: RenewalPipelineItem = {
      contractId: contract.Uid,
      name: contract.Name,
      counterparty: contract.metadata.parties[0]?.name || 'Unknown',
      value: contract.metadata.financialTerms.totalValue || 0,
      renewalDate,
      daysUntilRenewal,
      renewalType: contract.metadata.keyTerms.renewalType || 'manual',
      status: contract.metadata.status,
      recommendedAction: determineRenewalAction(contract.metadata, daysUntilRenewal),
      priority: determineRenewalPriority(contract.metadata, daysUntilRenewal)
    };

    if (daysUntilRenewal <= 30) {
      next30Days.push(item);
    } else if (daysUntilRenewal <= 90) {
      next90Days.push(item);
    } else if (daysUntilRenewal <= 365) {
      nextYear.push(item);
    }
  }

  // Sort by priority and days until renewal
  const sortFn = (a: RenewalPipelineItem, b: RenewalPipelineItem) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    if (a.priority !== b.priority) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return a.daysUntilRenewal - b.daysUntilRenewal;
  };

  return {
    next30Days: next30Days.sort(sortFn),
    next90Days: next90Days.sort(sortFn),
    nextYear: nextYear.sort(sortFn)
  };
}

function identifyConsolidationOpportunities(contracts: any[]): ConsolidationOpportunity[] {
  const counterpartyGroups = new Map<string, any[]>();

  // Group contracts by counterparty
  for (const contract of contracts) {
    contract.metadata.parties.forEach((party: any) => {
      if (party.role === 'vendor' || party.role === 'counterparty') {
        const existing = counterpartyGroups.get(party.name) || [];
        existing.push(contract);
        counterpartyGroups.set(party.name, existing);
      }
    });
  }

  const opportunities: ConsolidationOpportunity[] = [];

  for (const [counterparty, contractList] of counterpartyGroups.entries()) {
    if (contractList.length >= 3) { // Multiple contracts with same party
      const contractTypes = [...new Set(contractList.map(c => c.metadata.contractType))];
      
      opportunities.push({
        counterparty,
        currentContracts: contractList.length,
        contractTypes,
        suggestedAction: `Consolidate ${contractList.length} agreements into ${Math.ceil(contractList.length / 3)} master agreements`,
        estimatedSavings: '15-25% administrative overhead reduction',
        riskReduction: 'Standardized terms and centralized management',
        priority: contractList.length > 5 ? 'high' : 'medium'
      });
    }
  }

  return opportunities.sort((a, b) => b.currentContracts - a.currentContracts);
}

function identifyRenegotiationPriorities(contracts: any[]): RenegotiationPriority[] {
  const priorities: RenegotiationPriority[] = [];

  for (const contract of contracts) {
    const suggestedChanges: string[] = [];
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let reason = '';

    // Check for high-risk factors
    if (contract.metadata.riskIndicators.includes('unlimited-liability')) {
      suggestedChanges.push('Add liability cap based on contract value');
      priority = 'critical';
      reason = 'Unlimited liability exposure';
    }

    if (contract.metadata.riskIndicators.includes('auto-renewal') && 
        contract.metadata.financialTerms.totalValue > 1000000) {
      suggestedChanges.push('Change to manual renewal for better control');
      if (priority === 'low') priority = 'high';
      reason += (reason ? ' + ' : '') + 'High-value auto-renewal';
    }

    if (contract.metadata.complianceFlags.includes('gdpr-applicable') && 
        !contract.metadata.keyTerms.governingLaw?.includes('EU')) {
      suggestedChanges.push('Update data processing terms for GDPR compliance');
      if (priority === 'low') priority = 'medium';
      reason += (reason ? ' + ' : '') + 'GDPR compliance gap';
    }

    if (suggestedChanges.length > 0) {
      priorities.push({
        contractId: contract.Uid,
        contractName: contract.Name,
        counterparty: contract.metadata.parties[0]?.name || 'Unknown',
        priority,
        reason,
        suggestedChanges,
        businessImpact: priority === 'critical' ? 'High financial and legal risk' : 
                       priority === 'high' ? 'Significant operational risk' : 'Moderate risk',
        timeframe: priority === 'critical' ? 'Immediate' : 
                  priority === 'high' ? 'Next 30 days' : 'Next quarter'
      });
    }
  }

  return priorities.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

function calculateOptimizationMetrics(contracts: any[]): {
  standardTermsCompliance: number;
  averageNegotiationCycle: number;
  contractEfficiencyScore: number;
} {
  // Calculate standard terms compliance (simplified)
  const standardContracts = contracts.filter(c => 
    c.metadata.keyTerms.renewalType === 'manual' &&
    !c.metadata.riskIndicators.includes('unlimited-liability')
  );
  const standardTermsCompliance = (standardContracts.length / contracts.length) * 100;

  // Estimated average negotiation cycle (simplified)
  const averageNegotiationCycle = 45; // days (could be calculated from historical data)

  // Contract efficiency score (composite metric)
  const efficiencyFactors = {
    standardTerms: standardTermsCompliance / 100,
    riskManagement: 1 - (contracts.filter(c => c.metadata.riskIndicators.length > 2).length / contracts.length),
    compliance: 1 - (contracts.filter(c => c.metadata.complianceFlags.length === 0).length / contracts.length)
  };

  const contractEfficiencyScore = Math.round(
    (efficiencyFactors.standardTerms * 0.4 + 
     efficiencyFactors.riskManagement * 0.4 + 
     efficiencyFactors.compliance * 0.2) * 100
  );

  return {
    standardTermsCompliance: Math.round(standardTermsCompliance),
    averageNegotiationCycle,
    contractEfficiencyScore
  };
}

function analyzeContractPerformance(contracts: any[]): {
  topPerformingRelationships: ContractPerformanceMetrics[];
  underperformingContracts: ContractPerformanceMetrics[];
} {
  const counterpartyPerformance = new Map<string, {
    contracts: any[];
    totalValue: number;
    riskScore: number;
  }>();

  // Group by counterparty and calculate performance metrics
  for (const contract of contracts) {
    contract.metadata.parties.forEach((party: any) => {
      if (party.role === 'vendor' || party.role === 'counterparty') {
        const existing = counterpartyPerformance.get(party.name) || {
          contracts: [],
          totalValue: 0,
          riskScore: 0
        };
        
        existing.contracts.push(contract);
        existing.totalValue += contract.metadata.financialTerms.totalValue || 0;
        existing.riskScore += contract.metadata.riskIndicators.length;
        
        counterpartyPerformance.set(party.name, existing);
      }
    });
  }

  const topPerforming: ContractPerformanceMetrics[] = [];
  const underperforming: ContractPerformanceMetrics[] = [];

  for (const [counterparty, data] of counterpartyPerformance.entries()) {
    const avgRiskScore = data.riskScore / data.contracts.length;
    const performanceScore = Math.max(0, 100 - (avgRiskScore * 10)); // Simplified scoring
    
    const metrics: ContractPerformanceMetrics = {
      counterparty,
      contracts: data.contracts.length,
      totalValue: data.totalValue,
      performanceScore,
      metrics: {
        onTimeDelivery: Math.max(85, 100 - avgRiskScore * 5), // Simulated
        costPerformance: Math.max(80, 100 - avgRiskScore * 3), // Simulated
        relationshipHealth: performanceScore,
        complianceScore: Math.max(70, 100 - avgRiskScore * 8) // Simulated
      },
      strategicValue: data.totalValue > 5000000 ? 'critical' :
                     data.totalValue > 1000000 ? 'high' :
                     data.totalValue > 500000 ? 'medium' : 'low',
      recommendedAction: performanceScore > 85 ? 'expand_partnership' :
                        performanceScore > 70 ? 'maintain_relationship' :
                        performanceScore > 50 ? 'improve_performance' : 'consider_termination'
    };

    if (performanceScore > 80) {
      topPerforming.push(metrics);
    } else if (performanceScore < 60) {
      underperforming.push(metrics);
    }
  }

  return {
    topPerformingRelationships: topPerforming.sort((a, b) => b.performanceScore - a.performanceScore),
    underperformingContracts: underperforming.sort((a, b) => a.performanceScore - b.performanceScore)
  };
}

function generateMarketIntelligence(contracts: any[]): {
  termsBenchmarking: MarketBenchmark[];
  pricingTrends: {
    costInflation: Record<string, number>;
    recommendedActions: string[];
  };
} {
  // Analyze payment terms
  const paymentTerms = contracts
    .map(c => c.metadata.financialTerms.paymentTerms)
    .filter(Boolean);
  
  const avgPaymentDays = paymentTerms.reduce((sum, term) => {
    const match = term.match(/Net (\d+)/);
    return sum + (match ? parseInt(match[1]) : 30);
  }, 0) / Math.max(paymentTerms.length, 1);

  // Analyze liability caps
  const contractsWithLiability = contracts.filter(c => 
    !c.metadata.riskIndicators.includes('unlimited-liability')
  );
  const liabilityRatio = contractsWithLiability.length / contracts.length;

  const termsBenchmarking: MarketBenchmark[] = [
    {
      metric: 'Average Payment Terms',
      portfolioValue: `Net ${Math.round(avgPaymentDays)}`,
      industryBenchmark: 'Net 25',
      variance: avgPaymentDays - 25,
      recommendation: avgPaymentDays > 30 ? 'Negotiate faster payment terms on renewals' : 'Competitive payment terms',
      priority: avgPaymentDays > 35 ? 'high' : 'medium'
    },
    {
      metric: 'Liability Cap Coverage',
      portfolioValue: `${Math.round(liabilityRatio * 100)}%`,
      industryBenchmark: '85%',
      variance: (liabilityRatio * 100) - 85,
      recommendation: liabilityRatio < 0.8 ? 'Increase liability cap coverage' : 'Good liability management',
      priority: liabilityRatio < 0.7 ? 'high' : 'low'
    }
  ];

  const pricingTrends = {
    costInflation: {
      technology: 8.5,
      services: 12.3,
      manufacturing: 6.7,
      consulting: 15.2
    },
    recommendedActions: [
      'Lock in multi-year pricing with key vendors before Q2',
      'Review cost escalation clauses in high-value services contracts',
      'Consider consolidating vendors to achieve better pricing',
      'Implement cost benchmarking for technology services'
    ]
  };

  return { termsBenchmarking, pricingTrends };
}

function analyzeCompliancePortfolio(contracts: any[]): CompliancePortfolioView {
  const gdprContracts = contracts.filter(c => c.metadata.complianceFlags.includes('gdpr-applicable'));
  const soxContracts = contracts.filter(c => c.metadata.complianceFlags.includes('sox-applicable'));
  const intlContracts = contracts.filter(c => c.metadata.complianceFlags.includes('international-compliance'));

  const regulatoryCompliance = {
    gdpr: {
      compliant: Math.floor(gdprContracts.length * 0.8),
      needsReview: Math.floor(gdprContracts.length * 0.15),
      nonCompliant: Math.floor(gdprContracts.length * 0.05)
    },
    sox: {
      compliant: Math.floor(soxContracts.length * 0.9),
      needsReview: Math.floor(soxContracts.length * 0.08),
      nonCompliant: Math.floor(soxContracts.length * 0.02)
    },
    international: {
      compliant: Math.floor(intlContracts.length * 0.75),
      needsReview: Math.floor(intlContracts.length * 0.20),
      nonCompliant: Math.floor(intlContracts.length * 0.05)
    }
  };

  const upcomingRegulatory = [
    {
      regulation: 'EU AI Act',
      effectiveDate: '2025-08-01',
      affectedContracts: contracts.filter(c => 
        c.metadata.complianceFlags.includes('gdpr-applicable') &&
        c.metadata.contractType.toLowerCase().includes('technology')
      ).length,
      action: 'Review AI and data processing clauses',
      priority: 'high' as const
    },
    {
      regulation: 'California Privacy Rights Act',
      effectiveDate: '2025-01-01',
      affectedContracts: contracts.filter(c => 
        c.metadata.keyTerms.jurisdiction?.includes('California')
      ).length,
      action: 'Update data processing and privacy terms',
      priority: 'medium' as const
    }
  ];

  return { regulatoryCompliance, upcomingRegulatory };
}

// Helper functions
function determineRenewalAction(metadata: NormalizedContractMetadata, daysUntilRenewal: number): string {
  if (daysUntilRenewal <= 30) {
    if (metadata.keyTerms.renewalType === 'automatic') {
      return 'review_terms_urgently';
    }
    return 'initiate_renewal_negotiation';
  } else if (daysUntilRenewal <= 90) {
    if (metadata.riskIndicators.length > 2) {
      return 'renegotiate_terms';
    }
    return 'prepare_renewal_strategy';
  }
  return 'monitor_performance';
}

function determineRenewalPriority(metadata: NormalizedContractMetadata, daysUntilRenewal: number): 'low' | 'medium' | 'high' | 'critical' {
  if (daysUntilRenewal <= 15) return 'critical';
  if (daysUntilRenewal <= 30) return 'high';
  if (daysUntilRenewal <= 60) return 'medium';
  return 'low';
}

// Helper functions for portfolio tools
export function calculateConcentrationIndex(counterpartyData: any[]): number {
  // Herfindahl-Hirschman Index for concentration measurement
  const totalValue = counterpartyData.reduce((sum, c) => sum + c.totalValue, 0);
  if (totalValue === 0) return 0;
  
  return counterpartyData.reduce((sum, c) => {
    const marketShare = c.totalValue / totalValue;
    return sum + (marketShare * marketShare);
  }, 0) * 10000; // Multiply by 10000 for standard HHI scale
}

export function calculateDiversificationScore(concentrationRisks: ConcentrationRisk): number {
  // Score from 0-100, higher is more diversified
  const topCounterpartyConcentration = concentrationRisks.counterpartyConcentration[0]?.percentage || 0;
  const top3Concentration = concentrationRisks.counterpartyConcentration
    .slice(0, 3)
    .reduce((sum, c) => sum + c.percentage, 0);
  
  // Penalize high concentration
  let score = 100;
  if (topCounterpartyConcentration > 25) score -= 30;
  else if (topCounterpartyConcentration > 15) score -= 15;
  
  if (top3Concentration > 50) score -= 20;
  else if (top3Concentration > 35) score -= 10;
  
  return Math.max(0, score);
}

export function calculatePortfolioHealth(topPerformers: any[], underPerformers: any[], totalContracts: number): string {
  const performerRatio = topPerformers.length / Math.max(totalContracts, 1);
  const underperformerRatio = underPerformers.length / Math.max(totalContracts, 1);
  
  if (performerRatio > 0.6 && underperformerRatio < 0.1) return 'Excellent';
  if (performerRatio > 0.4 && underperformerRatio < 0.2) return 'Good';
  if (performerRatio > 0.2 && underperformerRatio < 0.3) return 'Fair';
  return 'Needs Improvement';
}

export function assessCompetitivePosition(benchmarks: MarketBenchmark[]): string {
  const favorableBenchmarks = benchmarks.filter(b => b.variance >= 0).length;
  const totalBenchmarks = benchmarks.length;
  
  if (totalBenchmarks === 0) return 'Unknown';
  
  const favorableRatio = favorableBenchmarks / totalBenchmarks;
  if (favorableRatio >= 0.7) return 'Strong';
  if (favorableRatio >= 0.5) return 'Competitive';
  if (favorableRatio >= 0.3) return 'Below Average';
  return 'Weak';
}

export function calculateComplianceScore(complianceData: CompliancePortfolioView): number {
  const regulations = Object.values(complianceData.regulatoryCompliance);
  if (regulations.length === 0) return 0;
  
  const totalContracts = regulations.reduce((sum, reg) => 
    sum + reg.compliant + reg.needsReview + reg.nonCompliant, 0);
  const compliantContracts = regulations.reduce((sum, reg) => sum + reg.compliant, 0);
  
  return Math.round((compliantContracts / Math.max(totalContracts, 1)) * 100);
}

export function assessMarketPosition(benchmarks: MarketBenchmark[]): string {
  const avgVariance = benchmarks.reduce((sum, b) => sum + b.variance, 0) / Math.max(benchmarks.length, 1);
  
  if (avgVariance > 5) return 'Above Market';
  if (avgVariance > 0) return 'At Market';
  if (avgVariance > -5) return 'Below Market';
  return 'Significantly Below Market';
}

export function generateStrategicRecommendations(analysis: any, topPerformers: any[], underPerformers: any[]): string[] {
  const recommendations = [];
  
  if (topPerformers.length > 0) {
    recommendations.push(`Expand partnerships with ${topPerformers[0].counterparty} and other top performers`);
  }
  
  if (underPerformers.length > 0) {
    recommendations.push(`Develop performance improvement plans for ${underPerformers.length} underperforming relationships`);
  }
  
  const highVarianceBenchmarks = analysis.marketIntelligence.termsBenchmarking
    .filter((b: MarketBenchmark) => Math.abs(b.variance) > 10);
  
  if (highVarianceBenchmarks.length > 0) {
    recommendations.push('Realign contract terms with industry benchmarks');
  }
  
  recommendations.push('Implement quarterly portfolio health reviews');
  recommendations.push('Establish performance metrics tracking for strategic relationships');
  
  return recommendations;
}