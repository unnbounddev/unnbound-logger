#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const COVERAGE_THRESHOLD = {
  branches: 80,
  functions: 80,
  lines: 80,
  statements: 80,
};

function runCoverage(): void {
  try {
    console.log('Running test coverage...\n');
    execSync('npm run test:coverage', { stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to run coverage:', error);
    process.exit(1);
  }
}

function checkCoverageThresholds(): void {
  try {
    const coverageSummary = JSON.parse(
      readFileSync(join(process.cwd(), 'coverage', 'coverage-summary.json'), 'utf-8')
    );

    const total = coverageSummary.total;
    let failed = false;

    console.log('\nChecking coverage thresholds...\n');

    for (const [metric, threshold] of Object.entries(COVERAGE_THRESHOLD)) {
      const value = total[metric].pct;
      const status = value >= threshold ? '✅' : '❌';
      console.log(`${metric.padEnd(12)}: ${value.toFixed(1)}% ${status} (threshold: ${threshold}%)`);

      if (value < threshold) {
        failed = true;
      }
    }

    if (failed) {
      console.error('\n❌ Coverage thresholds not met!');
      process.exit(1);
    } else {
      console.log('\n✅ All coverage thresholds met!');
    }
  } catch (error) {
    console.error('Failed to check coverage thresholds:', error);
    process.exit(1);
  }
}

// Run the coverage check
runCoverage();
checkCoverageThresholds();
