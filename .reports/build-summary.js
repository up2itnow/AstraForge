const fs = require('fs');

const path = '.reports/eslint-report.json';
if (!fs.existsSync(path)) {
  console.log('ESLint report not found, skipping summary generation');
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(path, 'utf8'));

let files = 0, errors = 0, warnings = 0, fixableErrors = 0, fixableWarnings = 0;
for (const f of data) {
  files++;
  errors += f.errorCount || 0;
  warnings += f.warningCount || 0;
  fixableErrors += f.fixableErrorCount || 0;
  fixableWarnings += f.fixableWarningCount || 0;
}

const summary = { files, errors, warnings, fixableErrors, fixableWarnings };
fs.writeFileSync('.reports/eslint-summary.json', JSON.stringify(summary, null, 2));
console.log('ESLint Summary:', JSON.stringify(summary, null, 2));

// Top rules by frequency
const counts = {};
for (const f of data) {
  for (const m of (f.messages || [])) {
    if (!m.ruleId) continue;
    counts[m.ruleId] = (counts[m.ruleId] || 0) + 1;
  }
}
const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([rule, count]) => ({ rule, count }));
fs.writeFileSync('.reports/eslint-top-rules.json', JSON.stringify(top, null, 2));
console.log('Top Rules:', JSON.stringify(top, null, 2));
