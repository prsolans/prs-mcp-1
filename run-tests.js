#!/usr/bin/env node

import { spawn } from 'child_process';
import { readdir } from 'fs/promises';
import { join } from 'path';

const TEST_DIRS = {
  'portfolio': 'Portfolio Analytics Tests',
  'auth': 'Authentication Tests', 
  'documents': 'Document Management Tests',
  'navigation': 'Navigator API Tests',
  'workflow': 'Workflow Automation Tests',
  'debug': 'Debug Utilities',
  'general': 'General CLM Tests'
};

async function runTest(testFile) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Running: ${testFile}`);
    const child = spawn('node', [testFile], { stdio: 'inherit' });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${testFile} - PASSED`);
        resolve(true);
      } else {
        console.log(`❌ ${testFile} - FAILED (exit code: ${code})`);
        resolve(false);
      }
    });
    
    child.on('error', (error) => {
      console.error(`🚨 ${testFile} - ERROR: ${error.message}`);
      resolve(false);
    });
  });
}

async function runTestSuite(category) {
  const testDir = join('tests', category);
  console.log(`\n📂 ${TEST_DIRS[category]}`);
  console.log('='.repeat(50));
  
  try {
    const files = await readdir(testDir);
    const testFiles = files.filter(f => f.endsWith('.js'));
    
    if (testFiles.length === 0) {
      console.log('No test files found');
      return { passed: 0, failed: 0 };
    }
    
    let passed = 0;
    let failed = 0;
    
    for (const file of testFiles) {
      const result = await runTest(join(testDir, file));
      if (result) {
        passed++;
      } else {
        failed++;
      }
    }
    
    return { passed, failed };
  } catch (error) {
    console.error(`Error reading test directory: ${error.message}`);
    return { passed: 0, failed: 1 };
  }
}

async function main() {
  console.log('🚀 DocuSign CLM Test Suite Runner');
  console.log('==================================\n');
  
  const args = process.argv.slice(2);
  const categoriesToRun = args.length > 0 ? args : Object.keys(TEST_DIRS);
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const category of categoriesToRun) {
    if (!TEST_DIRS[category]) {
      console.log(`❌ Unknown test category: ${category}`);
      continue;
    }
    
    const { passed, failed } = await runTestSuite(category);
    totalPassed += passed;
    totalFailed += failed;
  }
  
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`📊 Total:  ${totalPassed + totalFailed}`);
  
  if (totalFailed > 0) {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

// Usage information
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
DocuSign CLM Test Runner

Usage:
  node run-tests.js [category1] [category2] ...

Available categories:
${Object.entries(TEST_DIRS).map(([key, desc]) => `  ${key.padEnd(12)} - ${desc}`).join('\n')}

Examples:
  node run-tests.js                    # Run all tests
  node run-tests.js portfolio         # Run only portfolio tests  
  node run-tests.js auth workflow      # Run auth and workflow tests
  node run-tests.js --help             # Show this help
`);
  process.exit(0);
}

main().catch(console.error);