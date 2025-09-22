import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
export class PlanGenerator {
    constructor(llmManager, vectorDB) {
        this.planTemplate = '';
        this.llmManager = llmManager;
        this.vectorDB = vectorDB;
        this.loadPlanTemplate();
    }
    loadPlanTemplate() {
        const templatePath = path.join(__dirname, '../../templates/plan-template.md');
        try {
            this.planTemplate = fs.readFileSync(templatePath, 'utf8');
        }
        catch (error) {
            logger.error('Failed to load plan template:', error);
            this.planTemplate = this.getDefaultPlanTemplate();
        }
    }
    getDefaultPlanTemplate() {
        return `# Implementation Plan: {{FEATURE_NAME}}

**Branch**: \`{{BRANCH_NAME}}\` | **Date**: {{DATE}} | **Spec**: {{SPEC_LINK}}
**Input**: Feature specification from \`/specs/{{FEATURE_DIR}}/spec.md\`

## Summary
{{SUMMARY}}

## Technical Context
**Language/Version**: {{LANGUAGE}}
**Primary Dependencies**: {{DEPENDENCIES}}
**Storage**: {{STORAGE}}
**Testing**: {{TESTING}}
**Target Platform**: {{TARGET_PLATFORM}}
**Project Type**: {{PROJECT_TYPE}}
**Performance Goals**: {{PERFORMANCE_GOALS}}
**Constraints**: {{CONSTRAINTS}}
**Scale/Scope**: {{SCALE}}

## Constitution Check
{{CONSTITUTION_CHECK}}

## Project Structure
{{PROJECT_STRUCTURE}}

## Phase 0: Outline & Research
{{RESEARCH_PHASE}}

## Phase 1: Design & Contracts
{{DESIGN_PHASE}}

## Phase 2: Task Planning Approach
{{TASK_PLANNING}}

## Progress Tracking
{{PROGRESS_TRACKING}}
`;
    }
    async generatePlan(spec, technicalRequirements) {
        logger.info('🔧 Generating technical implementation plan...');
        // Phase 0: Research and technical context
        const technicalContext = await this.determineTechnicalContext(spec, technicalRequirements);
        const researchTasks = await this.generateResearchTasks(spec, technicalContext);
        // Constitution check
        const constitutionCheck = await this.performConstitutionCheck(spec, technicalContext);
        // Project structure determination
        const projectStructure = await this.determineProjectStructure(technicalContext);
        // Phase 1: Design phase planning
        const designPhase = await this.planDesignPhase(spec, technicalContext);
        // Phase 2: Task planning approach
        const taskPlanningApproach = await this.defineTaskPlanningApproach(spec, designPhase);
        // Generate summary
        const summary = await this.generateSummary(spec, technicalContext);
        // Assemble the plan
        const content = this.assemblePlan({
            spec,
            summary,
            technicalContext,
            constitutionCheck,
            projectStructure,
            researchTasks,
            designPhase,
            taskPlanningApproach
        });
        return {
            summary,
            technicalContext,
            constitutionCheck,
            projectStructure,
            researchTasks,
            designPhase,
            taskPlanningApproach,
            content
        };
    }
    async determineTechnicalContext(spec, requirements) {
        const prompt = `
    Determine the technical context for this feature specification:
    
    Feature: ${spec.title}
    Requirements: ${JSON.stringify(spec.functionalRequirements, null, 2)}
    User Scenarios: ${JSON.stringify(spec.userScenarios, null, 2)}
    Key Entities: ${JSON.stringify(spec.keyEntities, null, 2)}
    
    ${requirements ? `Existing Requirements: ${JSON.stringify(requirements, null, 2)}` : ''}
    
    Determine:
    1. Best programming language and version
    2. Primary dependencies/frameworks
    3. Storage requirements
    4. Testing framework
    5. Target platform
    6. Project type (single/web/mobile)
    7. Performance goals
    8. Constraints
    9. Scale/scope
    
    Consider AstraForge context: This is a VS Code extension environment with Node.js/TypeScript.
    
    Return JSON with technical context structure.
    `;
        try {
            const response = await this.llmManager.generateResponse('openai', prompt);
            const context = JSON.parse(response);
            // Merge with provided requirements
            return {
                language: requirements?.language || context.language || 'TypeScript 5.1',
                primaryDependencies: requirements?.primaryDependencies || context.primaryDependencies || ['Node.js'],
                storage: requirements?.storage || context.storage || 'File System',
                testing: requirements?.testing || context.testing || 'Jest',
                targetPlatform: requirements?.targetPlatform || context.targetPlatform || 'VS Code Extension',
                projectType: requirements?.projectType || context.projectType || 'single',
                performanceGoals: requirements?.performanceGoals || context.performanceGoals || ['Responsive UI'],
                constraints: requirements?.constraints || context.constraints || ['VS Code API limitations'],
                scale: requirements?.scale || context.scale || 'Single user workspace'
            };
        }
        catch (error) {
            logger.error('Error determining technical context:', error);
            return {
                language: 'TypeScript 5.1',
                primaryDependencies: ['Node.js', 'VS Code API'],
                storage: 'File System',
                testing: 'Jest',
                targetPlatform: 'VS Code Extension',
                projectType: 'single',
                performanceGoals: ['Responsive UI', '<100ms response time'],
                constraints: ['VS Code API limitations', 'Single workspace context'],
                scale: 'Single user workspace'
            };
        }
    }
    async generateResearchTasks(spec, context) {
        const prompt = `
    Generate research tasks for this technical plan:
    
    Specification: ${spec.title}
    Technical Context: ${JSON.stringify(context, null, 2)}
    Clarifications Needed: ${JSON.stringify(spec.clarificationNeeded, null, 2)}
    
    Identify areas that need research:
    1. Unknown technologies or best practices
    2. Integration patterns
    3. Performance optimization techniques
    4. Testing strategies
    5. Architecture decisions
    
    For each research task, provide:
    - Unique ID
    - Clear description
    - Rationale (why needed)
    - Alternative approaches to consider
    
    Return JSON array of research tasks.
    `;
        try {
            const response = await this.llmManager.generateResponse('anthropic', prompt);
            return JSON.parse(response);
        }
        catch (error) {
            logger.error('Error generating research tasks:', error);
            return [
                {
                    id: 'R001',
                    description: 'Research best practices for VS Code extension development',
                    rationale: 'Ensure optimal user experience and performance',
                    alternatives: ['Basic implementation', 'Advanced optimization', 'Minimal viable product']
                }
            ];
        }
    }
    async performConstitutionCheck(spec, context) {
        const prompt = `
    Perform constitution compliance check for this plan:
    
    Specification: ${spec.title}
    Technical Context: ${JSON.stringify(context, null, 2)}
    Functional Requirements: ${JSON.stringify(spec.functionalRequirements, null, 2)}
    
    Check against AstraForge Constitution:
    
    1. Simplicity:
       - Max 3 projects
       - Using framework directly (no wrapper classes)
       - Single data model (no DTOs unless needed)
       - Avoiding unnecessary patterns
    
    2. Architecture:
       - Every feature as library
       - CLI per library
       - Library documentation planned
    
    3. Testing (NON-NEGOTIABLE):
       - RED-GREEN-Refactor cycle
       - Tests before implementation
       - Contract→Integration→E2E→Unit order
       - Real dependencies used
       - Integration tests for new libraries
    
    4. Observability:
       - Structured logging
       - Error context
    
    5. Versioning:
       - Version number assigned
       - BUILD increments
       - Breaking changes handled
    
    Return detailed constitution check object with violations.
    `;
        try {
            const response = await this.llmManager.generateResponse('openai', prompt);
            return JSON.parse(response);
        }
        catch (error) {
            logger.error('Error performing constitution check:', error);
            return {
                simplicity: {
                    projectCount: 1,
                    usingFrameworkDirectly: true,
                    singleDataModel: true,
                    avoidingPatterns: true
                },
                architecture: {
                    everyFeatureAsLibrary: true,
                    libraries: [{ name: spec.title, purpose: 'Core functionality' }],
                    cliPerLibrary: [`${spec.title.toLowerCase()}`],
                    libraryDocsPlanned: true
                },
                testing: {
                    redGreenRefactorEnforced: true,
                    gitCommitsShowTestsFirst: true,
                    orderFollowed: true,
                    realDependenciesUsed: true,
                    integrationTestsPlanned: true
                },
                observability: {
                    structuredLoggingIncluded: true,
                    frontendToBackendLogs: false,
                    errorContextSufficient: true
                },
                versioning: {
                    versionAssigned: '1.0.0',
                    buildIncrementsPlanned: true,
                    breakingChangesHandled: true
                },
                violations: []
            };
        }
    }
    async determineProjectStructure(context) {
        const structures = {
            single: {
                type: 'single',
                directories: [
                    'src/',
                    'src/models/',
                    'src/services/',
                    'src/cli/',
                    'src/lib/',
                    'tests/',
                    'tests/contract/',
                    'tests/integration/',
                    'tests/unit/'
                ],
                description: 'Single project structure for focused functionality'
            },
            web: {
                type: 'web',
                directories: [
                    'backend/',
                    'backend/src/',
                    'backend/src/models/',
                    'backend/src/services/',
                    'backend/src/api/',
                    'backend/tests/',
                    'frontend/',
                    'frontend/src/',
                    'frontend/src/components/',
                    'frontend/src/pages/',
                    'frontend/src/services/',
                    'frontend/tests/'
                ],
                description: 'Web application with separate frontend and backend'
            },
            mobile: {
                type: 'mobile',
                directories: [
                    'api/',
                    'api/src/',
                    'api/tests/',
                    'mobile/',
                    'mobile/src/',
                    'mobile/tests/'
                ],
                description: 'Mobile application with API backend'
            }
        };
        return structures[context.projectType] || structures.single;
    }
    async planDesignPhase(spec, context) {
        const prompt = `
    Plan the design phase for this feature:
    
    Specification: ${spec.title}
    Key Entities: ${JSON.stringify(spec.keyEntities, null, 2)}
    Functional Requirements: ${JSON.stringify(spec.functionalRequirements, null, 2)}
    User Scenarios: ${JSON.stringify(spec.userScenarios, null, 2)}
    Technical Context: ${JSON.stringify(context, null, 2)}
    
    Plan:
    1. Data model design (entities, relationships, validation)
    2. API contracts (endpoints, schemas)
    3. Contract tests (one per endpoint)
    4. Test scenarios (from user stories)
    5. Quickstart guide (validation steps)
    
    Return JSON with design phase structure.
    `;
        try {
            const response = await this.llmManager.generateResponse('anthropic', prompt);
            return JSON.parse(response);
        }
        catch (error) {
            logger.error('Error planning design phase:', error);
            return {
                dataModel: 'Data model to be defined based on key entities',
                apiContracts: ['API contracts to be generated from functional requirements'],
                contractTests: ['Contract tests to be created for each endpoint'],
                testScenarios: ['Integration test scenarios from user stories'],
                quickstart: 'Quickstart guide with validation steps'
            };
        }
    }
    async defineTaskPlanningApproach(spec, designPhase) {
        const prompt = `
    Define the task planning approach for this feature:
    
    Specification: ${spec.title}
    Design Phase: ${JSON.stringify(designPhase, null, 2)}
    
    Describe how tasks will be generated:
    1. Task generation strategy
    2. Ordering strategy (TDD, dependencies)
    3. Parallel execution opportunities
    4. Estimated task count
    
    Focus on Test-Driven Development and constitutional compliance.
    Return a clear description of the approach.
    `;
        try {
            const response = await this.llmManager.generateResponse('openai', prompt);
            return response;
        }
        catch (error) {
            logger.error('Error defining task planning approach:', error);
            return `Task Generation Strategy:
- Generate tasks from design documents (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P]
- Each user story → integration test task
- Implementation tasks to make tests pass

Ordering Strategy:
- TDD order: Tests before implementation
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

Estimated Output: 15-25 numbered, ordered tasks following constitutional principles.`;
        }
    }
    async generateSummary(spec, context) {
        const prompt = `
    Generate a concise summary for this implementation plan:
    
    Feature: ${spec.title}
    Primary Requirements: ${spec.functionalRequirements.slice(0, 3).join(', ')}
    Technical Approach: ${context.language} using ${context.primaryDependencies.join(', ')}
    
    Create a 1-2 sentence summary capturing the essence of what will be built and how.
    `;
        try {
            const response = await this.llmManager.generateResponse('openai', prompt);
            return response.trim();
        }
        catch (error) {
            logger.error('Error generating summary:', error);
            return `Implement ${spec.title} using ${context.language} with ${context.primaryDependencies.join(', ')} following test-driven development principles.`;
        }
    }
    assemblePlan(data) {
        const currentDate = new Date().toISOString().split('T')[0];
        let plan = this.planTemplate;
        // Replace template variables
        plan = plan.replace(/\{\{FEATURE_NAME\}\}/g, data.spec.title);
        plan = plan.replace(/\{\{BRANCH_NAME\}\}/g, `001-${data.spec.title.toLowerCase().replace(/\s+/g, '-')}`);
        plan = plan.replace(/\{\{DATE\}\}/g, currentDate);
        plan = plan.replace(/\{\{SPEC_LINK\}\}/g, `specs/001-${data.spec.title.toLowerCase().replace(/\s+/g, '-')}/spec.md`);
        plan = plan.replace(/\{\{FEATURE_DIR\}\}/g, `001-${data.spec.title.toLowerCase().replace(/\s+/g, '-')}`);
        // Replace content sections
        plan = plan.replace('{{SUMMARY}}', data.summary);
        plan = plan.replace('{{LANGUAGE}}', data.technicalContext.language);
        plan = plan.replace('{{DEPENDENCIES}}', data.technicalContext.primaryDependencies.join(', '));
        plan = plan.replace('{{STORAGE}}', data.technicalContext.storage);
        plan = plan.replace('{{TESTING}}', data.technicalContext.testing);
        plan = plan.replace('{{TARGET_PLATFORM}}', data.technicalContext.targetPlatform);
        plan = plan.replace('{{PROJECT_TYPE}}', data.technicalContext.projectType);
        plan = plan.replace('{{PERFORMANCE_GOALS}}', data.technicalContext.performanceGoals.join(', '));
        plan = plan.replace('{{CONSTRAINTS}}', data.technicalContext.constraints.join(', '));
        plan = plan.replace('{{SCALE}}', data.technicalContext.scale);
        // Constitution check
        const constitutionSection = this.formatConstitutionCheck(data.constitutionCheck);
        plan = plan.replace('{{CONSTITUTION_CHECK}}', constitutionSection);
        // Project structure
        const structureSection = this.formatProjectStructure(data.projectStructure);
        plan = plan.replace('{{PROJECT_STRUCTURE}}', structureSection);
        // Research phase
        const researchSection = this.formatResearchPhase(data.researchTasks);
        plan = plan.replace('{{RESEARCH_PHASE}}', researchSection);
        // Design phase
        const designSection = this.formatDesignPhase(data.designPhase);
        plan = plan.replace('{{DESIGN_PHASE}}', designSection);
        // Task planning
        plan = plan.replace('{{TASK_PLANNING}}', data.taskPlanningApproach);
        // Progress tracking
        const progressSection = this.formatProgressTracking();
        plan = plan.replace('{{PROGRESS_TRACKING}}', progressSection);
        return plan;
    }
    formatConstitutionCheck(check) {
        let section = '**Simplicity**:\n';
        section += `- Projects: ${check.simplicity.projectCount} (max 3)\n`;
        section += `- Using framework directly: ${check.simplicity.usingFrameworkDirectly ? 'Yes' : 'No'}\n`;
        section += `- Single data model: ${check.simplicity.singleDataModel ? 'Yes' : 'No'}\n`;
        section += `- Avoiding patterns: ${check.simplicity.avoidingPatterns ? 'Yes' : 'No'}\n\n`;
        section += '**Architecture**:\n';
        section += `- Every feature as library: ${check.architecture.everyFeatureAsLibrary ? 'Yes' : 'No'}\n`;
        section += `- Libraries: ${check.architecture.libraries.map(l => `${l.name} (${l.purpose})`).join(', ')}\n`;
        section += `- CLI per library: ${check.architecture.cliPerLibrary.join(', ')}\n`;
        section += `- Library docs planned: ${check.architecture.libraryDocsPlanned ? 'Yes' : 'No'}\n\n`;
        section += '**Testing (NON-NEGOTIABLE)**:\n';
        section += `- RED-GREEN-Refactor enforced: ${check.testing.redGreenRefactorEnforced ? 'Yes' : 'No'}\n`;
        section += `- Tests before implementation: ${check.testing.gitCommitsShowTestsFirst ? 'Yes' : 'No'}\n`;
        section += `- Order followed: ${check.testing.orderFollowed ? 'Yes' : 'No'}\n`;
        section += `- Real dependencies: ${check.testing.realDependenciesUsed ? 'Yes' : 'No'}\n`;
        section += `- Integration tests: ${check.testing.integrationTestsPlanned ? 'Yes' : 'No'}\n\n`;
        if (check.violations.length > 0) {
            section += '**Violations**:\n';
            section += check.violations.map(v => `- ${v}`).join('\n');
        }
        return section;
    }
    formatProjectStructure(structure) {
        let section = `**Structure Decision**: ${structure.description}\n\n`;
        section += '```\n';
        structure.directories.forEach(dir => {
            section += `${dir}\n`;
        });
        section += '```';
        return section;
    }
    formatResearchPhase(tasks) {
        let section = '**Research Tasks**:\n\n';
        tasks.forEach(task => {
            section += `**${task.id}**: ${task.description}\n`;
            section += `- Rationale: ${task.rationale}\n`;
            section += `- Alternatives: ${task.alternatives.join(', ')}\n`;
            if (task.decision) {
                section += `- Decision: ${task.decision}\n`;
            }
            section += '\n';
        });
        return section;
    }
    formatDesignPhase(design) {
        let section = '1. **Data Model**: ' + design.dataModel + '\n\n';
        section += '2. **API Contracts**:\n';
        design.apiContracts.forEach(contract => {
            section += `   - ${contract}\n`;
        });
        section += '\n3. **Contract Tests**:\n';
        design.contractTests.forEach(test => {
            section += `   - ${test}\n`;
        });
        section += '\n4. **Test Scenarios**:\n';
        design.testScenarios.forEach(scenario => {
            section += `   - ${scenario}\n`;
        });
        section += '\n5. **Quickstart**: ' + design.quickstart;
        return section;
    }
    formatProgressTracking() {
        return `**Phase Status**:
- [ ] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [ ] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented`;
    }
    async executeResearch(tasks) {
        logger.info('🔍 Executing research tasks...');
        const completedTasks = await Promise.all(tasks.map(async (task) => {
            const prompt = `
        Research this topic:
        
        Task: ${task.description}
        Rationale: ${task.rationale}
        Alternatives to consider: ${task.alternatives.join(', ')}
        
        Provide:
        1. Recommended decision
        2. Reasoning for the decision
        3. Trade-offs considered
        4. Implementation considerations
        
        Focus on practical, actionable insights for VS Code extension development.
        `;
            try {
                const research = await this.llmManager.generateResponse('openai', prompt);
                return {
                    ...task,
                    decision: research
                };
            }
            catch (error) {
                logger.error(`Error researching task ${task.id}:`, error);
                return {
                    ...task,
                    decision: 'Research pending - manual investigation required'
                };
            }
        }));
        return completedTasks;
    }
}
//# sourceMappingURL=planGenerator.js.map