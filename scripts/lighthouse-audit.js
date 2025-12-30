#!/usr/bin/env node

// Check if lighthouse is installed
try {
  require('lighthouse');
  require('chrome-launcher');
} catch (error) {
  console.log('📦 Installing required dependencies...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install lighthouse chrome-launcher --save-dev', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully!');
  } catch (installError) {
    console.error('❌ Failed to install dependencies. Please run:');
    console.error('npm install lighthouse chrome-launcher --save-dev');
    process.exit(1);
  }
}

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// Pages to audit
const PAGES_TO_AUDIT = [
  { name: 'Homepage', url: 'http://localhost:3000' },
  { name: 'Login', url: 'http://localhost:3000/login' },
  { name: 'Register', url: 'http://localhost:3000/register' },
  { name: 'Dashboard', url: 'http://localhost:3000/dashboard' },
  { name: 'Buy Airtime', url: 'http://localhost:3000/dashboard/buy-airtime' },
  { name: 'Fund Wallet', url: 'http://localhost:3000/dashboard/fund-wallet' },
];

// Lighthouse configuration
const LIGHTHOUSE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'mobile',
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4,
    },
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
    },
    emulatedUserAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
  },
};

// Performance thresholds
const THRESHOLDS = {
  performance: 90,
  accessibility: 95,
  'best-practices': 90,
  seo: 95,
  pwa: 80,
};

async function runLighthouseAudit() {
  console.log('🚀 Starting Lighthouse Performance Audit...\n');

  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const results = [];

  try {
    for (const page of PAGES_TO_AUDIT) {
      console.log(`📊 Auditing: ${page.name} (${page.url})`);
      
      const runnerResult = await lighthouse(page.url, {
        port: chrome.port,
        ...LIGHTHOUSE_CONFIG,
      });

      const scores = runnerResult.lhr.categories;
      const metrics = runnerResult.lhr.audits;

      const pageResult = {
        name: page.name,
        url: page.url,
        scores: {
          performance: Math.round(scores.performance.score * 100),
          accessibility: Math.round(scores.accessibility.score * 100),
          'best-practices': Math.round(scores['best-practices'].score * 100),
          seo: Math.round(scores.seo.score * 100),
          pwa: scores.pwa ? Math.round(scores.pwa.score * 100) : 0,
        },
        metrics: {
          'first-contentful-paint': metrics['first-contentful-paint'].numericValue,
          'largest-contentful-paint': metrics['largest-contentful-paint'].numericValue,
          'cumulative-layout-shift': metrics['cumulative-layout-shift'].numericValue,
          'total-blocking-time': metrics['total-blocking-time'].numericValue,
          'speed-index': metrics['speed-index'].numericValue,
        },
        opportunities: runnerResult.lhr.audits['opportunities'] || [],
        diagnostics: runnerResult.lhr.audits['diagnostics'] || [],
      };

      results.push(pageResult);
      
      // Display results
      displayPageResults(pageResult);
    }

    // Generate summary report
    generateSummaryReport(results);
    
    // Save detailed results
    saveDetailedResults(results);

  } catch (error) {
    console.error('❌ Lighthouse audit failed:', error);
  } finally {
    await chrome.kill();
  }
}

function displayPageResults(result) {
  console.log(`\n📈 Results for ${result.name}:`);
  console.log('─'.repeat(50));
  
  Object.entries(result.scores).forEach(([category, score]) => {
    const threshold = THRESHOLDS[category];
    const status = score >= threshold ? '✅' : '⚠️';
    const color = score >= threshold ? '\x1b[32m' : '\x1b[33m';
    
    console.log(`${status} ${category.padEnd(15)}: ${color}${score}%\x1b[0m (threshold: ${threshold}%)`);
  });

  console.log('\n⚡ Core Web Vitals:');
  console.log(`   FCP: ${Math.round(result.metrics['first-contentful-paint'])}ms`);
  console.log(`   LCP: ${Math.round(result.metrics['largest-contentful-paint'])}ms`);
  console.log(`   CLS: ${result.metrics['cumulative-layout-shift'].toFixed(3)}`);
  console.log(`   TBT: ${Math.round(result.metrics['total-blocking-time'])}ms`);
  console.log(`   SI:  ${Math.round(result.metrics['speed-index'])}`);
}

function generateSummaryReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 LIGHTHOUSE AUDIT SUMMARY');
  console.log('='.repeat(60));

  // Calculate averages
  const averages = {
    performance: 0,
    accessibility: 0,
    'best-practices': 0,
    seo: 0,
    pwa: 0,
  };

  results.forEach(result => {
    Object.keys(averages).forEach(category => {
      averages[category] += result.scores[category];
    });
  });

  Object.keys(averages).forEach(category => {
    averages[category] = Math.round(averages[category] / results.length);
  });

  console.log('\n🎯 Average Scores:');
  Object.entries(averages).forEach(([category, score]) => {
    const threshold = THRESHOLDS[category];
    const status = score >= threshold ? '✅' : '❌';
    const color = score >= threshold ? '\x1b[32m' : '\x1b[31m';
    
    console.log(`${status} ${category.padEnd(15)}: ${color}${score}%\x1b[0m`);
  });

  // Performance recommendations
  console.log('\n💡 Performance Recommendations:');
  
  const lowPerformancePages = results.filter(r => r.scores.performance < THRESHOLDS.performance);
  if (lowPerformancePages.length > 0) {
    console.log('⚠️  Pages needing performance optimization:');
    lowPerformancePages.forEach(page => {
      console.log(`   - ${page.name}: ${page.scores.performance}%`);
    });
  } else {
    console.log('✅ All pages meet performance thresholds!');
  }

  // Core Web Vitals summary
  console.log('\n⚡ Core Web Vitals Summary:');
  const avgMetrics = {
    fcp: 0,
    lcp: 0,
    cls: 0,
    tbt: 0,
  };

  results.forEach(result => {
    avgMetrics.fcp += result.metrics['first-contentful-paint'];
    avgMetrics.lcp += result.metrics['largest-contentful-paint'];
    avgMetrics.cls += result.metrics['cumulative-layout-shift'];
    avgMetrics.tbt += result.metrics['total-blocking-time'];
  });

  const pageCount = results.length;
  console.log(`   Average FCP: ${Math.round(avgMetrics.fcp / pageCount)}ms ${avgMetrics.fcp / pageCount <= 1800 ? '✅' : '⚠️'}`);
  console.log(`   Average LCP: ${Math.round(avgMetrics.lcp / pageCount)}ms ${avgMetrics.lcp / pageCount <= 2500 ? '✅' : '⚠️'}`);
  console.log(`   Average CLS: ${(avgMetrics.cls / pageCount).toFixed(3)} ${avgMetrics.cls / pageCount <= 0.1 ? '✅' : '⚠️'}`);
  console.log(`   Average TBT: ${Math.round(avgMetrics.tbt / pageCount)}ms ${avgMetrics.tbt / pageCount <= 200 ? '✅' : '⚠️'}`);

  // Overall grade
  const overallScore = Object.values(averages).reduce((sum, score) => sum + score, 0) / Object.keys(averages).length;
  console.log('\n🏆 Overall Grade:');
  
  let grade, color;
  if (overallScore >= 95) {
    grade = 'A+';
    color = '\x1b[32m';
  } else if (overallScore >= 90) {
    grade = 'A';
    color = '\x1b[32m';
  } else if (overallScore >= 85) {
    grade = 'B+';
    color = '\x1b[33m';
  } else if (overallScore >= 80) {
    grade = 'B';
    color = '\x1b[33m';
  } else {
    grade = 'C';
    color = '\x1b[31m';
  }

  console.log(`${color}${grade} (${Math.round(overallScore)}%)\x1b[0m`);
}

function saveDetailedResults(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `lighthouse-audit-${timestamp}.json`;
  const filepath = path.join(__dirname, '..', 'reports', filename);

  // Ensure reports directory exists
  const reportsDir = path.dirname(filepath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Save results
  fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Detailed results saved to: ${filepath}`);

  // Generate HTML report
  generateHTMLReport(results, filepath.replace('.json', '.html'));
}

function generateHTMLReport(results, filepath) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TADA VTU - Lighthouse Audit Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #22c55e; text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .good { color: #22c55e; }
        .needs-improvement { color: #f59e0b; }
        .poor { color: #ef4444; }
        .page-results { margin-bottom: 30px; }
        .page-card { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .scores { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 15px; }
        .score { text-align: center; padding: 10px; background: white; border-radius: 4px; }
        .timestamp { text-align: center; color: #666; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 TADA VTU - Lighthouse Audit Report</h1>
        
        <div class="summary">
            ${Object.entries(calculateAverages(results)).map(([category, score]) => `
                <div class="metric-card">
                    <h3>${category.replace('-', ' ').toUpperCase()}</h3>
                    <div class="metric-value ${getScoreClass(score, THRESHOLDS[category])}">${score}%</div>
                </div>
            `).join('')}
        </div>

        <div class="page-results">
            <h2>📊 Page-by-Page Results</h2>
            ${results.map(result => `
                <div class="page-card">
                    <h3>${result.name}</h3>
                    <p><strong>URL:</strong> ${result.url}</p>
                    <div class="scores">
                        ${Object.entries(result.scores).map(([category, score]) => `
                            <div class="score">
                                <div><strong>${category.replace('-', ' ')}</strong></div>
                                <div class="metric-value ${getScoreClass(score, THRESHOLDS[category])}">${score}%</div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: 15px;">
                        <strong>Core Web Vitals:</strong>
                        FCP: ${Math.round(result.metrics['first-contentful-paint'])}ms |
                        LCP: ${Math.round(result.metrics['largest-contentful-paint'])}ms |
                        CLS: ${result.metrics['cumulative-layout-shift'].toFixed(3)} |
                        TBT: ${Math.round(result.metrics['total-blocking-time'])}ms
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="timestamp">
            Generated on ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>`;

  fs.writeFileSync(filepath, html);
  console.log(`📄 HTML report saved to: ${filepath}`);
}

function calculateAverages(results) {
  const averages = {
    performance: 0,
    accessibility: 0,
    'best-practices': 0,
    seo: 0,
    pwa: 0,
  };

  results.forEach(result => {
    Object.keys(averages).forEach(category => {
      averages[category] += result.scores[category];
    });
  });

  Object.keys(averages).forEach(category => {
    averages[category] = Math.round(averages[category] / results.length);
  });

  return averages;
}

function getScoreClass(score, threshold) {
  if (score >= threshold) return 'good';
  if (score >= threshold - 10) return 'needs-improvement';
  return 'poor';
}

// Run the audit
if (require.main === module) {
  runLighthouseAudit().catch(console.error);
}

module.exports = { runLighthouseAudit };