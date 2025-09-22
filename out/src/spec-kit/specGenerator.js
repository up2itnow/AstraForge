import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
export class SpecGenerator {
    constructor(llmManager, vectorDB) {
        this.specTemplate = '';
        this.llmManager = llmManager;
        this.vectorDB = vectorDB;
        this.loadSpecTemplate();
    }
    loadSpecTemplate() {
        const templatePath = path.join(__dirname, '../../templates/spec-template.md');
        try {
            this.specTemplate = fs.readFileSync(templatePath, 'utf8');
        }
        catch (error) {
            console.error('Failed to load spec template:', error);
            this.specTemplate = this.getDefaultSpecTemplate();
        }
    }
    getDefaultSpecTemplate() {
        return `# Feature Specification: {{FEATURE_NAME}}

**Feature Branch**: \`{{BRANCH_NAME}}\`  
**Created**: {{DATE}}  
**Status**: Draft  
**Input**: User description: "{{USER_INPUT}}"

## User Scenarios & Testing

### Primary User Story
{{PRIMARY_USER_STORY}}

### Acceptance Scenarios
{{ACCEPTANCE_SCENARIOS}}

### Edge Cases
{{EDGE_CASES}}

## Requirements

### Functional Requirements
{{FUNCTIONAL_REQUIREMENTS}}

### Key Entities
{{KEY_ENTITIES}}

## Review & Acceptance Checklist

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

## Clarifications Needed
{{CLARIFICATIONS_NEEDED}}
`;
    }
    async generateSpecification(request) {
        logger.info('Generating specification from user idea...');
        // Step 1: Parse and understand the user idea
        const parsedIdea = await this.parseUserIdea(request.userIdea, request.projectContext);
        // Step 2: Generate specification sections using multi-LLM collaboration
        const specSections = await this.generateSpecSections(parsedIdea, request);
        // Step 3: Check constitution compliance
        const constitutionCheck = await this.checkConstitutionCompliance(specSections);
        // Step 4: Identify clarification needs
        const clarifications = await this.identifyClarifications(specSections);
        // Step 5: Assemble the final specification
        const finalSpec = this.assembleSpecification(request, specSections, clarifications);
        return {
            title: specSections.featureName,
            content: finalSpec,
            clarificationNeeded: clarifications,
            functionalRequirements: specSections.functionalRequirements,
            userScenarios: specSections.userScenarios,
            keyEntities: specSections.keyEntities,
            constitutionCompliance: constitutionCheck
        };
    }
    async parseUserIdea(userIdea, context) {
        const prompt = `
    Parse this user idea into structured components:
    
    User Idea: "${userIdea}"
    ${context ? `Project Context: ${context}` : ''}
    
    Extract:
    1. Core functionality (what the user wants)
    2. Key actors/users involved
    3. Main actions/workflows
    4. Data entities mentioned
    5. Constraints or requirements
    6. Success criteria (if mentioned)
    
    Return as structured JSON with clear categories.
    `;
        try {
            const response = await this.llmManager.generateResponse('openai', prompt);
            return JSON.parse(response);
        }
        catch (error) {
            console.error('Error parsing user idea:', error);
            // Fallback to simple parsing
            return {
                coreFunctionality: userIdea,
                actors: ['User'],
                actions: ['Use the system'],
                entities: [],
                constraints: [],
                successCriteria: []
            };
        }
    }
    async generateSpecSections(parsedIdea, request) {
        // Use multi-LLM collaboration for better spec generation
        const llmProviders = ['openai', 'anthropic', 'openrouter'];
        const sections = {};
        // Generate feature name
        sections.featureName = await this.generateFeatureName(parsedIdea);
        sections.branchName = this.generateBranchName(sections.featureName);
        // Generate user scenarios using different LLMs for diversity
        sections.userScenarios = await this.generateUserScenarios(parsedIdea, llmProviders[0]);
        sections.acceptanceScenarios = await this.generateAcceptanceScenarios(parsedIdea, llmProviders[1]);
        sections.edgeCases = await this.generateEdgeCases(parsedIdea, llmProviders[2]);
        // Generate functional requirements
        sections.functionalRequirements = await this.generateFunctionalRequirements(parsedIdea, sections.userScenarios);
        // Identify key entities
        sections.keyEntities = await this.identifyKeyEntities(parsedIdea, sections.functionalRequirements);
        return sections;
    }
    async generateFeatureName(parsedIdea) {
        const prompt = `
    Generate a concise, descriptive feature name for this functionality:
    ${JSON.stringify(parsedIdea, null, 2)}
    
    Requirements:
    - 2-5 words maximum
    - Clear and professional
    - Focuses on user value
    - Suitable for branch names
    
    Return only the feature name, no explanation.
    `;
        const response = await this.llmManager.generateResponse('openai', prompt);
        return response.trim().replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
    }
    generateBranchName(featureName) {
        const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
        return `001-${featureName}-${timestamp}`;
    }
    async generateUserScenarios(parsedIdea, provider) {
        const prompt = `
    Create primary user scenarios for this feature:
    ${JSON.stringify(parsedIdea, null, 2)}
    
    Generate 1-3 clear user scenarios in this format:
    "As a [user type], I want to [action] so that [benefit]"
    
    Focus on the main value propositions and user workflows.
    Return as JSON array of strings.
    `;
        try {
            const response = await this.llmManager.generateResponse(provider, prompt);
            return JSON.parse(response);
        }
        catch (error) {
            console.error('Error generating user scenarios:', error);
            return [`As a user, I want to ${parsedIdea.coreFunctionality} so that I can achieve my goals`];
        }
    }
    async generateAcceptanceScenarios(parsedIdea, provider) {
        const prompt = `
    Create acceptance scenarios in Given-When-Then format for:
    ${JSON.stringify(parsedIdea, null, 2)}
    
    Generate 3-5 scenarios covering:
    1. Happy path (main functionality)
    2. Alternative flows
    3. Error conditions
    
    Format: "Given [initial state], When [action], Then [expected outcome]"
    Return as JSON array of strings.
    `;
        try {
            const response = await this.llmManager.generateResponse(provider, prompt);
            return JSON.parse(response);
        }
        catch (error) {
            console.error('Error generating acceptance scenarios:', error);
            return ['Given initial state, When user performs action, Then system responds appropriately'];
        }
    }
    async generateEdgeCases(parsedIdea, provider) {
        const prompt = `
    Identify potential edge cases and error scenarios for:
    ${JSON.stringify(parsedIdea, null, 2)}
    
    Consider:
    1. Invalid inputs
    2. System limitations
    3. Network/connectivity issues
    4. Concurrent usage
    5. Data boundary conditions
    
    Return as JSON array of strings describing each edge case.
    `;
        try {
            const response = await this.llmManager.generateResponse(provider, prompt);
            return JSON.parse(response);
        }
        catch (error) {
            console.error('Error generating edge cases:', error);
            return ['What happens when invalid input is provided?', 'How does system handle high load?'];
        }
    }
    async generateFunctionalRequirements(parsedIdea, userScenarios) {
        const prompt = `
    Generate functional requirements from this analysis:
    
    Parsed Idea: ${JSON.stringify(parsedIdea, null, 2)}
    User Scenarios: ${JSON.stringify(userScenarios, null, 2)}
    
    Create 5-10 functional requirements in format:
    "FR-001: System MUST [specific capability]"
    "FR-002: Users MUST be able to [specific action]"
    
    Requirements should be:
    - Testable and measurable
    - Focused on WHAT, not HOW
    - Cover all major functionality
    - Include validation and error handling
    
    Return as JSON array of strings.
    `;
        try {
            const response = await this.llmManager.generateResponse('openai', prompt);
            return JSON.parse(response);
        }
        catch (error) {
            console.error('Error generating functional requirements:', error);
            return ['FR-001: System MUST provide core functionality', 'FR-002: Users MUST be able to interact with the system'];
        }
    }
    async identifyKeyEntities(parsedIdea, requirements) {
        const prompt = `
    Identify key data entities from this analysis:
    
    Parsed Idea: ${JSON.stringify(parsedIdea, null, 2)}
    Functional Requirements: ${JSON.stringify(requirements, null, 2)}
    
    For each entity, provide:
    - Entity name
    - Brief description of what it represents
    - Key attributes (conceptual, not technical)
    - Relationships to other entities
    
    Focus on business/domain entities, not technical implementation.
    Return as JSON array of objects with name, description, attributes, relationships.
    `;
        try {
            const response = await this.llmManager.generateResponse('anthropic', prompt);
            const entities = JSON.parse(response);
            return entities.map((entity) => `${entity.name}: ${entity.description}`);
        }
        catch (error) {
            console.error('Error identifying key entities:', error);
            return ['User: Person who interacts with the system'];
        }
    }
    async checkConstitutionCompliance(specSections) {
        const prompt = `
    Check this specification against AstraForge development constitution:
    
    Specification: ${JSON.stringify(specSections, null, 2)}
    
    Evaluate:
    1. Simplicity (avoid over-engineering)
    2. Clear scope and boundaries
    3. Testable requirements
    4. User-focused (not tech-focused)
    5. Appropriate complexity level
    
    Return JSON with:
    {
      "passed": boolean,
      "violations": ["specific issues"],
      "warnings": ["potential concerns"],
      "complexityScore": 1-10 (1=simple, 10=very complex)
    }
    `;
        try {
            const response = await this.llmManager.generateResponse('openai', prompt);
            return JSON.parse(response);
        }
        catch (error) {
            console.error('Error checking constitution compliance:', error);
            return {
                passed: true,
                violations: [],
                warnings: [],
                complexityScore: 5
            };
        }
    }
    async identifyClarifications(specSections) {
        const prompt = `
    Identify areas that need clarification in this specification:
    
    ${JSON.stringify(specSections, null, 2)}
    
    Look for:
    1. Ambiguous requirements
    2. Missing user types/roles
    3. Undefined business rules
    4. Unclear success criteria
    5. Integration assumptions
    6. Performance/scale expectations
    
    Return JSON array of specific questions that need answers.
    Format: "NEEDS CLARIFICATION: [specific question]"
    `;
        try {
            const response = await this.llmManager.generateResponse('anthropic', prompt);
            return JSON.parse(response);
        }
        catch (error) {
            console.error('Error identifying clarifications:', error);
            return [];
        }
    }
    assembleSpecification(request, sections, clarifications) {
        const currentDate = new Date().toISOString().split('T')[0];
        let spec = this.specTemplate;
        // Replace template variables
        spec = spec.replace('{{FEATURE_NAME}}', sections.featureName || 'New Feature');
        spec = spec.replace('{{BRANCH_NAME}}', sections.branchName || '001-new-feature');
        spec = spec.replace('{{DATE}}', currentDate);
        spec = spec.replace('{{USER_INPUT}}', request.userIdea || 'User provided idea');
        // Replace content sections
        spec = spec.replace('{{PRIMARY_USER_STORY}}', sections.userScenarios?.join('\n\n') || 'User story to be defined');
        spec = spec.replace('{{ACCEPTANCE_SCENARIOS}}', sections.acceptanceScenarios?.map((s, i) => `${i + 1}. ${s}`).join('\n') || 'Scenarios to be defined');
        spec = spec.replace('{{EDGE_CASES}}', sections.edgeCases?.map((e) => `- ${e}`).join('\n') || 'Edge cases to be identified');
        spec = spec.replace('{{FUNCTIONAL_REQUIREMENTS}}', sections.functionalRequirements?.map((r) => `- **${r}**`).join('\n') || 'Requirements to be defined');
        spec = spec.replace('{{KEY_ENTITIES}}', sections.keyEntities?.map((e) => `- **${e}**`).join('\n') || 'Entities to be identified');
        spec = spec.replace('{{CLARIFICATIONS_NEEDED}}', clarifications.map(c => `- ${c}`).join('\n') || 'No clarifications needed');
        return spec;
    }
    async refineSpecification(existingSpec, refinements) {
        logger.info('Refining specification...');
        const prompt = `
    Refine this existing specification based on user feedback:
    
    Existing Spec:
    ${existingSpec}
    
    Refinements Requested:
    ${refinements.join('\n')}
    
    Update the specification to address the refinements while maintaining structure and quality.
    Return the complete refined specification.
    `;
        const refinedContent = await this.llmManager.generateResponse('openai', prompt);
        // Re-analyze the refined specification
        const analysis = await this.analyzeSpecification(refinedContent);
        return {
            title: analysis.title,
            content: refinedContent,
            clarificationNeeded: analysis.clarificationNeeded,
            functionalRequirements: analysis.functionalRequirements,
            userScenarios: analysis.userScenarios,
            keyEntities: analysis.keyEntities,
            constitutionCompliance: analysis.constitutionCompliance
        };
    }
    async analyzeSpecification(specContent) {
        // Extract information from the specification content
        const prompt = `
    Analyze this specification and extract structured information:
    
    ${specContent}
    
    Return JSON with:
    {
      "title": "feature name",
      "clarificationNeeded": ["list of clarifications"],
      "functionalRequirements": ["list of requirements"],
      "userScenarios": ["list of scenarios"],
      "keyEntities": ["list of entities"],
      "constitutionCompliance": {
        "passed": boolean,
        "violations": [],
        "warnings": [],
        "complexityScore": number
      }
    }
    `;
        try {
            const response = await this.llmManager.generateResponse('anthropic', prompt);
            return JSON.parse(response);
        }
        catch (error) {
            console.error('Error analyzing specification:', error);
            return {
                title: 'Analyzed Feature',
                clarificationNeeded: [],
                functionalRequirements: [],
                userScenarios: [],
                keyEntities: [],
                constitutionCompliance: { passed: true, violations: [], warnings: [], complexityScore: 5 }
            };
        }
    }
}
//# sourceMappingURL=specGenerator.js.map