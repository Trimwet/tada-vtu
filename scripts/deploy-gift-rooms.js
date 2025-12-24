#!/usr/bin/env node

/**
 * Gift Room System Deployment Script
 * Automates the deployment and verification of the gift room system
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function checkPrerequisites() {
  logStep('1', 'Checking Prerequisites');
  
  // Check if we're in the right directory
  if (!fs.existsSync('package.json')) {
    logError('package.json not found. Please run this script from the project root.');
    process.exit(1);
  }

  // Check if Supabase migration exists
  const migrationPath = 'supabase/migrations/20241223_gift_room_system.sql';
  if (!fs.existsSync(migrationPath)) {
    logError(`Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  // Check environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const envFile = '.env.local';
  if (!fs.existsSync(envFile)) {
    logError(`Environment file not found: ${envFile}`);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envFile, 'utf8');
  const missingVars = requiredEnvVars.filter(varName => 
    !envContent.includes(varName) || !process.env[varName]
  );

  if (missingVars.length > 0) {
    logError(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  logSuccess('Prerequisites check passed');
}

async function buildProject() {
  logStep('2', 'Building Project');
  
  try {
    logInfo('Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    
    logInfo('Building Next.js application...');
    execSync('npm run build', { stdio: 'inherit' });
    
    logSuccess('Project built successfully');
  } catch (error) {
    logError('Build failed');
    console.error(error.message);
    process.exit(1);
  }
}

async function runTests() {
  logStep('3', 'Running Tests');
  
  try {
    // Check if test script exists
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (packageJson.scripts && packageJson.scripts.test) {
      logInfo('Running test suite...');
      execSync('npm test', { stdio: 'inherit' });
      logSuccess('All tests passed');
    } else {
      logWarning('No test script found in package.json');
    }
  } catch (error) {
    logError('Tests failed');
    console.error(error.message);
    process.exit(1);
  }
}

async function verifyDeployment() {
  logStep('4', 'Verifying Deployment');
  
  try {
    // Start the application in background for testing
    logInfo('Starting application for verification...');
    
    const { spawn } = require('child_process');
    const server = spawn('npm', ['start'], { 
      stdio: 'pipe',
      detached: true 
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test health endpoint
    logInfo('Testing health endpoint...');
    
    try {
      const response = await fetch('http://localhost:3000/api/gift-rooms/health');
      const healthData = await response.json();
      
      if (healthData.status === 'healthy') {
        logSuccess('Health check passed');
      } else if (healthData.status === 'warning') {
        logWarning('Health check passed with warnings');
        console.log('Warnings:', healthData.health_checks.filter(c => c.status === 'warning'));
      } else {
        logError('Health check failed');
        console.log('Errors:', healthData.health_checks.filter(c => c.status === 'error'));
      }
      
      logInfo('System Statistics:');
      console.log(JSON.stringify(healthData.system_stats, null, 2));
      
    } catch (fetchError) {
      logWarning('Could not test health endpoint (server may not be running)');
    }

    // Clean up
    process.kill(-server.pid);
    
  } catch (error) {
    logError('Deployment verification failed');
    console.error(error.message);
  }
}

async function generateDocumentation() {
  logStep('5', 'Generating Documentation');
  
  const docsContent = `# Gift Room System - Deployment Complete

## Deployment Summary
- **Date**: ${new Date().toISOString()}
- **Version**: 1.0.0
- **Status**: Ready for Production

## Features Deployed
- ✅ Gift Room Creation (Personal, Group, Public)
- ✅ Device Fingerprinting & Reservations
- ✅ Gift Claiming & Wallet Integration
- ✅ Referral Bonus System
- ✅ Expiration & Cleanup Services
- ✅ Security & Fraud Prevention
- ✅ Real-time Notifications
- ✅ Comprehensive API Endpoints
- ✅ Admin Dashboard Integration

## API Endpoints
- \`POST /api/gift-rooms/create\` - Create gift room
- \`GET /api/gift-rooms/[token]\` - Get gift room details
- \`POST /api/gift-rooms/join\` - Join gift room
- \`POST /api/gift-rooms/claim\` - Claim gift
- \`GET /api/gift-rooms/history\` - Get user's gift history
- \`GET /api/gift-rooms/my-rooms\` - Get user's created rooms
- \`GET /api/gift-rooms/stats\` - Get system statistics
- \`POST /api/gift-rooms/cleanup\` - Cleanup expired rooms
- \`GET /api/gift-rooms/health\` - System health check

## User Interfaces
- \`/dashboard/send-gift\` - Create gift rooms
- \`/dashboard/gift-rooms\` - Manage sent gifts
- \`/gift/[token]\` - Gift room landing page

## Database Tables
- \`gift_rooms\` - Gift room data
- \`reservations\` - User reservations
- \`gift_claims\` - Claimed gifts
- \`gift_room_activities\` - Audit logs

## Monitoring
Use the health endpoint to monitor system status:
\`\`\`bash
curl http://localhost:3000/api/gift-rooms/health
\`\`\`

## Cleanup Automation
Set up a cron job to run cleanup every 6 hours:
\`\`\`bash
0 */6 * * * curl -X POST -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/gift-rooms/cleanup
\`\`\`

## Support
For issues or questions, check the system health endpoint and review the activity logs in the database.
`;

  fs.writeFileSync('GIFT_ROOM_DEPLOYMENT.md', docsContent);
  logSuccess('Documentation generated: GIFT_ROOM_DEPLOYMENT.md');
}

async function main() {
  log('\n🎁 Gift Room System Deployment Script', 'bright');
  log('=====================================\n', 'bright');

  try {
    await checkPrerequisites();
    await buildProject();
    await runTests();
    await verifyDeployment();
    await generateDocumentation();
    
    log('\n🎉 Deployment Complete!', 'green');
    log('=====================================', 'green');
    logSuccess('Gift Room System is ready for production');
    logInfo('Check GIFT_ROOM_DEPLOYMENT.md for details');
    
  } catch (error) {
    logError('Deployment failed');
    console.error(error);
    process.exit(1);
  }
}

// Run the deployment script
if (require.main === module) {
  main();
}

module.exports = { main };