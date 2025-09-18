# Data Model Design

## Core Entities

### CodeReview
**Purpose**: Represents a single analysis session with comprehensive metadata

**Attributes**:
- `id`: Unique identifier (UUID)
- `timestamp`: Analysis start time (ISO string)
- `files`: Array of file paths analyzed
- `gitCommit`: Git commit hash if applicable
- `status`: 'pending' | 'analyzing' | 'completed' | 'failed'
- `duration`: Analysis time in milliseconds
- `suggestionCount`: Total number of suggestions generated
- `qualityScore`: Overall quality score (0-100)

**Relationships**:
- One-to-many with Suggestion
- One-to-one with QualityMetric
- Many-to-one with ReviewSession

**Validation Rules**:
- ID must be valid UUID
- Files array must not be empty
- Status must be valid enum value
- Quality score must be 0-100

---

### Suggestion
**Purpose**: Individual improvement recommendation with detailed context

**Attributes**:
- `id`: Unique identifier (UUID)
- `reviewId`: Foreign key to CodeReview
- `type`: 'bug-risk' | 'performance' | 'style' | 'security' | 'maintainability'
- `severity`: 'critical' | 'warning' | 'info'
- `title`: Brief description of the issue
- `description`: Detailed explanation and rationale
- `filePath`: File location of the issue
- `lineStart`: Starting line number
- `lineEnd`: Ending line number (for multi-line issues)
- `originalCode`: Code snippet that triggered the suggestion
- `suggestedFix`: Recommended code improvement (optional)
- `aiModel`: LLM that generated this suggestion
- `confidence`: AI confidence score (0-1)
- `userFeedback`: 'accepted' | 'rejected' | 'modified' | null
- `createdAt`: Timestamp

**Relationships**:
- Many-to-one with CodeReview
- One-to-many with UserFeedback (historical)

**Validation Rules**:
- Type and severity must be valid enum values
- Line numbers must be positive integers
- Confidence must be 0-1
- File path must exist in review files

---

### QualityMetric
**Purpose**: Quantitative measures for code quality tracking

**Attributes**:
- `id`: Unique identifier (UUID)
- `reviewId`: Foreign key to CodeReview
- `complexityScore`: Average cyclomatic complexity
- `maintainabilityIndex`: Microsoft maintainability index
- `duplicatedLines`: Number of duplicated code lines
- `testCoverage`: Estimated test coverage impact
- `technicalDebt`: Technical debt score (minutes to fix)
- `readabilityScore`: AI-generated readability assessment
- `architecturalConsistency`: Consistency with project patterns
- `performanceIndex`: Performance characteristic score
- `securityScore`: Security vulnerability assessment

**Relationships**:
- One-to-one with CodeReview
- Part of historical trend in ReviewSession

**Validation Rules**:
- All scores must be non-negative numbers
- Percentage values (coverage) must be 0-100
- Technical debt must be in minutes

---

### ReviewSession
**Purpose**: Container for related reviews across a feature branch or time period

**Attributes**:
- `id`: Unique identifier (UUID)
- `name`: Human-readable session name
- `startDate`: Session start timestamp
- `endDate`: Session end timestamp (null if active)
- `branchName`: Git branch name
- `totalReviews`: Number of reviews in session
- `averageQuality`: Average quality score across reviews
- `improvementTrend`: 'improving' | 'stable' | 'declining'
- `keyInsights`: Array of important findings

**Relationships**:
- One-to-many with CodeReview
- Contains aggregated QualityMetric trends

**Validation Rules**:
- End date must be after start date if present
- Total reviews must match actual review count
- Average quality must be 0-100

---

### UserPreference
**Purpose**: Developer-specific settings and learning data

**Attributes**:
- `userId`: Developer identifier (from VS Code)
- `reviewSensitivity`: 'strict' | 'balanced' | 'lenient'
- `preferredModels`: Array of preferred AI models
- `ignoredSuggestionTypes`: Array of suggestion types to suppress
- `autoApplyFixes`: Boolean for automatic fix application
- `showInlineDecorations`: Boolean for inline UI elements
- `historicalAcceptanceRate`: Percentage of accepted suggestions
- `learningPreferences`: Object with model-specific learning settings
- `notificationSettings`: Object with notification preferences

**Relationships**:
- One-to-many with historical UserFeedback
- Influences suggestion generation and display

**Validation Rules**:
- Sensitivity must be valid enum value
- Preferred models must be valid AI provider names
- Acceptance rate must be 0-100
- All arrays must contain valid enum values

---

## Data Flow

```
1. File Change Detection → Create CodeReview
2. Multi-LLM Analysis → Generate Suggestions
3. Metric Calculation → Create QualityMetric
4. UI Display → Show suggestions with UserPreference filtering
5. User Interaction → Update UserFeedback and learning data
6. Session Aggregation → Update ReviewSession trends
```

## Storage Strategy

**Vector Database**: 
- Code embeddings for similarity search
- Successful suggestion patterns
- Project-specific coding conventions

**File System**:
- User preferences (JSON)
- Session data (JSON)
- Cached analysis results

**Memory**:
- Active review state
- Real-time suggestion processing
- UI state management

## Performance Considerations

- **Lazy Loading**: Load suggestion details on demand
- **Pagination**: Limit suggestion display for large reviews
- **Caching**: Cache metric calculations for unchanged code
- **Indexing**: Index reviews by file path and timestamp
- **Cleanup**: Archive old sessions to prevent storage bloat
