#!/usr/bin/env node

const { spawn } = require('child_process');
const os = require('os');

// Windows compatibility
const isWindows = os.platform() === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

console.log('🔍 Checking TypeScript errors...\n');

// Run TypeScript check
const tsc = spawn(npmCmd, ['run', 'type-check'], { stdio: 'inherit', shell: isWindows });

tsc.on('close', (code) => {
  if (code === 0) {
    console.log('✅ No TypeScript errors found\n');
  } else {
    console.log('\n❌ TypeScript errors found above\n');
  }
  
  console.log('🔍 Checking ESLint errors and warnings...\n');
  
  // Run ESLint check
  const eslint = spawn(npmCmd, ['run', 'lint'], { stdio: 'inherit', shell: isWindows });
  
  eslint.on('close', (eslintCode) => {
    if (eslintCode === 0) {
      console.log('✅ No ESLint errors found');
    } else {
      console.log('\n❌ ESLint errors/warnings found above');
    }
    
    console.log('\n📊 Summary:');
    console.log(`TypeScript: ${code === 0 ? '✅ Pass' : '❌ Fail'}`);
    console.log(`ESLint: ${eslintCode === 0 ? '✅ Pass' : '❌ Fail'}`);
  });
});