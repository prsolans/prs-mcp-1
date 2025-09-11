/**
 * CLM Document Processing and Intelligence Layer
 * Transforms raw CLM API responses into structured, actionable insights
 */

// Standardized Contract Metadata Structure
export interface NormalizedContractMetadata {
  // Core Contract Details
  contractType: string;
  status: string;
  effectiveDate?: string;
  expirationDate?: string;
  renewalDate?: string;
  
  // Parties and Relationships
  parties: Array<{
    name: string;
    role: 'client' | 'vendor' | 'counterparty' | 'other';
    type: 'individual' | 'corporation' | 'partnership' | 'government';
  }>;
  
  // Financial Terms
  financialTerms: {
    totalValue?: number;
    currency?: string;
    paymentTerms?: string;
    billingFrequency?: string;
    lateFees?: string;
  };
  
  // Key Contract Terms
  keyTerms: {
    termLength?: string;
    renewalType?: 'manual' | 'automatic' | 'none';
    terminationNotice?: string;
    jurisdiction?: string;
    governingLaw?: string;
  };
  
  // Risk and Compliance
  riskIndicators: string[];
  complianceFlags: string[];
  
  // Business Classification
  businessUnit?: string;
  department?: string;
  projectCode?: string;
  
  // Raw AttributeGroups (preserved for reference)
  originalAttributeGroups: Record<string, any>;
}

// Document Relationship Structure
export interface DocumentRelationship {
  id: string;
  name: string;
  type: string;
  relationship: 'parent' | 'child' | 'amendment' | 'addendum' | 'related' | 'superseded' | 'version';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  suggestedAction?: string;
}

// Action Item Structure
export interface ActionItem {
  id: string;
  type: 'review' | 'renewal' | 'payment' | 'compliance' | 'termination' | 'negotiation' | 'approval';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  dueDate?: string;
  assignedTo?: string;
  relatedClause?: string;
  estimatedEffort?: string;
  businessImpact: 'high' | 'medium' | 'low';
  consequences?: string;
}

// Enhanced Document Intelligence
export interface DocumentIntelligence {
  document: {
    uid: string;
    name: string;
    path: string;
    version: string;
    lastModified: string;
  };
  
  normalizedMetadata: NormalizedContractMetadata;
  
  relationships: {
    suggested: DocumentRelationship[];
    confirmed: DocumentRelationship[];
  };
  
  actionItems: ActionItem[];
  
  contextualSummary: string;
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: Array<{
      factor: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      mitigation?: string;
    }>;
  };
}

/**
 * Helper function to extract value from CLM AttributeGroup field as string
 */
function extractAttributeValue(field: any): string | undefined {
  if (!field) return undefined;
  if (typeof field === 'string') return field;
  if (typeof field === 'number') return field.toString();
  if (field.Value !== undefined) {
    return typeof field.Value === 'string' ? field.Value : field.Value.toString();
  }
  return undefined;
}

/**
 * Helper function to extract numeric value from CLM AttributeGroup field
 */
function extractNumericValue(field: any): number | undefined {
  if (!field) return undefined;
  if (typeof field === 'number') return field;
  if (typeof field === 'string') {
    const num = parseFloat(field);
    return isNaN(num) ? undefined : num;
  }
  if (field.Value !== undefined) {
    const val = field.Value;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    }
  }
  return undefined;
}

/**
 * Transform raw CLM AttributeGroups into normalized contract metadata
 */
export function normalizeContractMetadata(attributeGroups: Record<string, any>): NormalizedContractMetadata {
  // Handle the actual CLM data structure from your system
  const clmDetails = attributeGroups['CLM Agreement Details'] || {};
  const contractDetails = attributeGroups['Contract Details'] || {};
  const financialDetails = attributeGroups['Financial Details'] || {};
  const partyDetails = attributeGroups['Party Details'] || {};
  
  // Handle specific agreement types found in your data
  const commercialLoan = attributeGroups['Commercial Loan Agreement'] || {};
  const agreementCounterparties = attributeGroups['Agreement Counterparties'] || {};
  const contractTemplates = attributeGroups['Contract Templates'] || {};
  const emTemplates = attributeGroups['EM - Templates'] || {};
  
  // Handle CLM standard attribute groups found in search results
  const clmAgreementDetails = attributeGroups['CLM Agreement Details'] || {};
  const clmParty = attributeGroups['CLM Party'] || {};
  const contract = attributeGroups['Contract'] || {};
  
  // Debug: Log extracted values for portfolio analytics
  if (Object.keys(clmAgreementDetails).length > 0) {
    console.error('CLM Agreement extraction:', {
      partyName: extractAttributeValue(clmAgreementDetails['Party Name']),
      contractValue: extractNumericValue(clmAgreementDetails['Value']),
      contractType: extractAttributeValue(clmAgreementDetails['Type']),
      effectiveDate: extractAttributeValue(clmAgreementDetails['Effective Date'])
    });
  }
  
  // Extract parties using actual field structure
  const parties = [];
  
  // From Agreement Counterparties (nested structure)
  if (agreementCounterparties['Business Details']?.Items) {
    agreementCounterparties['Business Details'].Items.forEach((item: any) => {
      const businessName = extractAttributeValue(item['Business Name']);
      if (businessName) {
        parties.push({
          name: businessName,
          role: 'counterparty' as const,
          type: 'corporation' as const
        });
      }
    });
  }
  
  // From CLM Agreement Details structure (search result documents)
  const clmPartyName = extractAttributeValue(clmAgreementDetails['Party Name']);
  if (clmPartyName) {
    parties.push({
      name: clmPartyName,
      role: 'counterparty' as const,
      type: 'corporation' as const
    });
  }
  
  // Fallback to other party detection methods
  const clientName = extractAttributeValue(clmDetails['Client Name']) || 
                    extractAttributeValue(partyDetails['Client Name']);
  if (clientName) {
    parties.push({
      name: clientName,
      role: 'client' as const,
      type: 'corporation' as const
    });
  }
  
  const vendorName = extractAttributeValue(clmDetails['Vendor Name']) || 
                    extractAttributeValue(partyDetails['Vendor Name']);
  if (vendorName) {
    parties.push({
      name: vendorName,
      role: 'vendor' as const,
      type: 'corporation' as const
    });
  }
  
  // Extract financial information using actual field names
  const agreementAmount = extractNumericValue(commercialLoan['Agreement Amount']);
  const clmContractValue = extractNumericValue(clmAgreementDetails['Value']);  // This is the key field!
  const contractValue = agreementAmount ||
                       clmContractValue ||
                       extractNumericValue(clmDetails['Contract Value']) || 
                       extractNumericValue(financialDetails['Total Value']) || 
                       0;
  
  // Determine contract type from actual data structure
  let contractType = 'Unknown';
  if (commercialLoan['Agreement Amount']) {
    contractType = 'Commercial Loan Agreement';
  } else if (clmAgreementDetails['Type'] || clmAgreementDetails['Value']) {
    contractType = extractAttributeValue(clmAgreementDetails['Type']) || 'CLM Agreement';
  } else if (contractTemplates['Template ID']) {
    contractType = 'Contract Template';
  } else if (emTemplates['Agreement Type']) {
    contractType = extractAttributeValue(emTemplates['Agreement Type']) || 'Entertainment Agreement';
  } else if (clmDetails['Name']) {
    const name = extractAttributeValue(clmDetails['Name']) || '';
    if (name.toLowerCase().includes('master')) contractType = 'Master Agreement';
    else if (name.toLowerCase().includes('service')) contractType = 'Service Agreement';
    else contractType = 'Agreement';
  }
  
  // Extract status from actual fields
  const status = extractAttributeValue(commercialLoan['Status']) ||
                extractAttributeValue(clmAgreementDetails['Status']) ||
                extractAttributeValue(clmAgreementDetails['Agreement Status']) ||
                extractAttributeValue(contractTemplates['Status']) ||
                extractAttributeValue(clmDetails['Status']) ||
                extractAttributeValue(contractDetails['Status']) ||
                'Unknown';
  
  // Extract dates with proper formatting
  const effectiveDate = extractAttributeValue(commercialLoan['Effective Date']) ||
                       extractAttributeValue(clmAgreementDetails['Effective Date']) ||
                       extractAttributeValue(clmAgreementDetails['Start Date']) ||
                       extractAttributeValue(clmDetails['Effective Date']) ||
                       extractAttributeValue(contractDetails['Effective Date']);
  
  const expirationDate = extractAttributeValue(commercialLoan['Maturity Date']) ||
                        extractAttributeValue(clmAgreementDetails['Expiration Date']) ||
                        extractAttributeValue(clmAgreementDetails['End Date']) ||
                        extractAttributeValue(clmDetails['Expiration Date']) ||
                        extractAttributeValue(contractDetails['End Date']);
  
  // Determine risk indicators based on actual data
  const riskIndicators = [];
  if (contractValue && contractValue > 1000000) {
    riskIndicators.push('high-value');
  }
  if (extractAttributeValue(clmDetails['Auto Renewal']) === 'Yes') {
    riskIndicators.push('auto-renewal');
  }
  if (extractAttributeValue(clmDetails['Unlimited Liability']) === 'Yes') {
    riskIndicators.push('unlimited-liability');
  }
  
  // Determine compliance flags
  const complianceFlags = [];
  if (extractAttributeValue(clmDetails['Data Processing']) === 'Yes') {
    complianceFlags.push('gdpr-applicable');
  }
  if (extractAttributeValue(clmDetails['Public Company']) === 'Yes') {
    complianceFlags.push('sox-applicable');
  }
  
  // Check for international contracts
  if (agreementCounterparties['Business Details']?.Items) {
    const hasInternational = agreementCounterparties['Business Details'].Items.some((item: any) => {
      const country = extractAttributeValue(item['Country']);
      return country && country !== 'United States Of America';
    });
    if (hasInternational) {
      complianceFlags.push('international-compliance');
    }
  }
  
  return {
    contractType,
    status: status,
    effectiveDate: effectiveDate,
    expirationDate: expirationDate,
    renewalDate: extractAttributeValue(clmAgreementDetails['Renewal Date']) ||
                extractAttributeValue(clmDetails['Renewal Date']),
    
    parties,
    
    financialTerms: {
      totalValue: contractValue || 0,
      currency: 'USD',  // Default for now
      paymentTerms: extractAttributeValue(clmAgreementDetails['Payment Terms']) ||
                   extractAttributeValue(clmDetails['Payment Terms']) || 
                   extractAttributeValue(financialDetails['Payment Terms']),
      billingFrequency: extractAttributeValue(clmDetails['Billing Frequency']) || 
                       extractAttributeValue(financialDetails['Billing Frequency']),
      lateFees: extractAttributeValue(clmAgreementDetails['Payment Late Fees']) ||
               extractAttributeValue(clmDetails['Late Fees']) || 
               extractAttributeValue(financialDetails['Late Fees'])
    },
    
    keyTerms: {
      termLength: extractAttributeValue(clmDetails['Term Length']) || 
                 extractAttributeValue(contractDetails['Duration']),
      renewalType: extractAttributeValue(clmDetails['Auto Renewal']) === 'Yes' ? 'automatic' : 'manual',
      terminationNotice: extractAttributeValue(clmDetails['Termination Notice']),
      jurisdiction: extractAttributeValue(clmDetails['Jurisdiction']) || 
                   extractAttributeValue(contractDetails['Jurisdiction']),
      governingLaw: extractAttributeValue(clmDetails['Governing Law']) || 
                   extractAttributeValue(contractDetails['Governing Law'])
    },
    
    riskIndicators,
    complianceFlags,
    
    businessUnit: extractAttributeValue(clmDetails['Business Unit']) || 
                 extractAttributeValue(contractDetails['Business Unit']) ||
                 extractAttributeValue(emTemplates['Business Unit']),
    department: extractAttributeValue(clmDetails['Department']) || 
               extractAttributeValue(contractDetails['Department']),
    projectCode: extractAttributeValue(clmDetails['Project Code']) || 
                extractAttributeValue(contractDetails['Project Code']),
    
    originalAttributeGroups: attributeGroups
  };
}

/**
 * Suggest document relationships based on metadata analysis
 */
export function suggestDocumentRelationships(
  currentDoc: any, 
  allDocs: any[]
): DocumentRelationship[] {
  const suggestions: DocumentRelationship[] = [];
  const currentMetadata = normalizeContractMetadata(currentDoc.AttributeGroups || {});
  
  for (const doc of allDocs) {
    if (doc.Uid === currentDoc.Uid) continue; // Skip self
    
    const docMetadata = normalizeContractMetadata(doc.AttributeGroups || {});
    
    // Check for amendments (same parties, similar name, later date)
    if (currentDoc.Name.toLowerCase().includes('amendment') || 
        doc.Name.toLowerCase().includes('amendment')) {
      const similarity = calculateNameSimilarity(currentDoc.Name, doc.Name);
      if (similarity > 0.7 && haveSameParties(currentMetadata, docMetadata)) {
        suggestions.push({
          id: doc.Uid,
          name: doc.Name,
          type: doc.AttributeGroups?.['CLM Agreement Details']?.Type || 'Document',
          relationship: 'amendment',
          confidence: 'high',
          reason: 'Document names suggest amendment relationship and parties match',
          suggestedAction: 'Confirm if this is an amendment to the base agreement'
        });
      }
    }
    
    // Check for master/SOW relationships
    if ((currentMetadata.contractType === 'Master Service Agreement' && 
         docMetadata.contractType === 'Statement of Work') ||
        (docMetadata.contractType === 'Master Service Agreement' && 
         currentMetadata.contractType === 'Statement of Work')) {
      if (haveSameParties(currentMetadata, docMetadata)) {
        suggestions.push({
          id: doc.Uid,
          name: doc.Name,
          type: docMetadata.contractType,
          relationship: currentMetadata.contractType === 'Master Service Agreement' ? 'parent' : 'child',
          confidence: 'high',
          reason: 'Master Service Agreement and Statement of Work with same parties',
          suggestedAction: 'Link these documents as master agreement and work order'
        });
      }
    }
    
    // Check for version relationships (same name, different versions)
    if (calculateNameSimilarity(currentDoc.Name, doc.Name) > 0.8 && 
        currentDoc.Version !== doc.Version) {
      suggestions.push({
        id: doc.Uid,
        name: doc.Name,
        type: docMetadata.contractType,
        relationship: 'version',
        confidence: 'medium',
        reason: `Similar document names but different versions (${currentDoc.Version} vs ${doc.Version})`,
        suggestedAction: 'Confirm if this is a different version of the same agreement'
      });
    }
  }
  
  return suggestions;
}

/**
 * Extract actionable items from contract metadata
 */
export function extractActionItems(metadata: NormalizedContractMetadata, document: any): ActionItem[] {
  const actions: ActionItem[] = [];
  const now = new Date();
  
  // Renewal actions
  if (metadata.renewalDate) {
    const renewalDate = new Date(metadata.renewalDate);
    const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilRenewal <= 90 && daysUntilRenewal > 0) {
      actions.push({
        id: `renewal-${document.Uid}`,
        type: 'renewal',
        priority: daysUntilRenewal <= 30 ? 'critical' : 'high',
        title: `Contract Renewal Due Soon`,
        description: `${metadata.contractType} with ${metadata.parties[0]?.name} renews in ${daysUntilRenewal} days`,
        dueDate: metadata.renewalDate,
        estimatedEffort: '2-4 hours',
        businessImpact: 'high',
        consequences: 'Service interruption if not renewed on time'
      });
    }
  }
  
  // Expiration actions
  if (metadata.expirationDate) {
    const expirationDate = new Date(metadata.expirationDate);
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiration <= 60 && daysUntilExpiration > 0) {
      actions.push({
        id: `expiration-${document.Uid}`,
        type: 'review',
        priority: daysUntilExpiration <= 30 ? 'critical' : 'high',
        title: `Contract Expiring Soon`,
        description: `${metadata.contractType} expires in ${daysUntilExpiration} days - decide on renewal or replacement`,
        dueDate: metadata.expirationDate,
        estimatedEffort: '1-2 hours',
        businessImpact: 'high',
        consequences: 'Contract will terminate automatically'
      });
    }
  }
  
  // Risk-based actions
  if (metadata.riskIndicators.includes('unlimited-liability')) {
    actions.push({
      id: `liability-review-${document.Uid}`,
      type: 'review',
      priority: 'high',
      title: 'Review Unlimited Liability Clause',
      description: 'Contract contains unlimited liability - consider negotiating a liability cap',
      relatedClause: 'Liability and Indemnification',
      estimatedEffort: '3-5 hours',
      businessImpact: 'high',
      consequences: 'Unlimited financial exposure in case of breach'
    });
  }
  
  if (metadata.riskIndicators.includes('auto-renewal')) {
    actions.push({
      id: `auto-renewal-${document.Uid}`,
      type: 'review',
      priority: 'medium',
      title: 'Auto-Renewal Contract Monitoring',
      description: 'Contract has auto-renewal clause - set calendar reminder for opt-out deadline',
      estimatedEffort: '30 minutes',
      businessImpact: 'medium',
      consequences: 'Automatic renewal if termination notice not provided on time'
    });
  }
  
  // Compliance actions
  if (metadata.complianceFlags.includes('gdpr-applicable')) {
    actions.push({
      id: `gdpr-review-${document.Uid}`,
      type: 'compliance',
      priority: 'medium',
      title: 'GDPR Compliance Review',
      description: 'Verify data processing terms comply with GDPR requirements',
      estimatedEffort: '2-3 hours',
      businessImpact: 'high',
      consequences: 'Potential GDPR fines for non-compliance'
    });
  }
  
  return actions;
}

// Helper functions
function calculateNameSimilarity(name1: string, name2: string): number {
  const a = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = name2.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  
  if (longer.length === 0) return 1;
  
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  
  return matches / longer.length;
}

function haveSameParties(metadata1: NormalizedContractMetadata, metadata2: NormalizedContractMetadata): boolean {
  const parties1 = metadata1.parties.map(p => p.name.toLowerCase()).sort();
  const parties2 = metadata2.parties.map(p => p.name.toLowerCase()).sort();
  
  if (parties1.length !== parties2.length) return false;
  
  return parties1.every((party, index) => party === parties2[index]);
}

/**
 * Process a CLM document with full intelligence extraction
 */
export function processDocumentIntelligence(
  document: any, 
  relatedDocuments: any[] = []
): DocumentIntelligence {
  const normalizedMetadata = normalizeContractMetadata(document.AttributeGroups || {});
  const suggestedRelationships = suggestDocumentRelationships(document, relatedDocuments);
  const actionItems = extractActionItems(normalizedMetadata, document);
  
  // Generate contextual summary
  const summary = generateContextualSummary(document, normalizedMetadata);
  
  // Assess overall risk
  const riskAssessment = assessDocumentRisk(normalizedMetadata);
  
  return {
    document: {
      uid: document.Uid,
      name: document.Name,
      path: document.Path,
      version: document.Version,
      lastModified: document.UpdatedDate
    },
    normalizedMetadata,
    relationships: {
      suggested: suggestedRelationships,
      confirmed: [] // To be populated by user confirmations
    },
    actionItems,
    contextualSummary: summary,
    riskAssessment
  };
}

function generateContextualSummary(document: any, metadata: NormalizedContractMetadata): string {
  const parties = metadata.parties.map(p => p.name).join(' and ');
  const value = metadata.financialTerms.totalValue ? 
    ` worth ${metadata.financialTerms.currency}${metadata.financialTerms.totalValue.toLocaleString()}` : '';
  
  return `${metadata.contractType} between ${parties}${value}, ` +
         `effective ${metadata.effectiveDate || 'unknown date'}` +
         (metadata.expirationDate ? ` until ${metadata.expirationDate}` : '') +
         (metadata.keyTerms.renewalType === 'automatic' ? ' with auto-renewal' : '');
}

function assessDocumentRisk(metadata: NormalizedContractMetadata): DocumentIntelligence['riskAssessment'] {
  const riskFactors = [];
  let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
  
  if (metadata.riskIndicators.includes('unlimited-liability')) {
    riskFactors.push({
      factor: 'Unlimited Liability',
      severity: 'high' as const,
      description: 'Contract contains unlimited liability clause',
      mitigation: 'Negotiate liability cap based on contract value'
    });
    overallRisk = 'high';
  }
  
  if (metadata.riskIndicators.includes('high-value')) {
    riskFactors.push({
      factor: 'High Contract Value',
      severity: 'medium' as const,
      description: 'Contract value exceeds $1M threshold',
      mitigation: 'Ensure proper approval levels and monitoring'
    });
    if (overallRisk === 'low') overallRisk = 'medium';
  }
  
  if (metadata.riskIndicators.includes('short-termination-notice')) {
    riskFactors.push({
      factor: 'Short Termination Notice',
      severity: 'medium' as const,
      description: 'Less than 30 days termination notice required',
      mitigation: 'Set calendar reminders well in advance'
    });
    if (overallRisk === 'low') overallRisk = 'medium';
  }
  
  return { overallRisk, riskFactors };
}