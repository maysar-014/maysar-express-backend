const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, 'services');
const services = fs.readdirSync(servicesDir).filter(f => 
    fs.statSync(path.join(servicesDir, f)).isDirectory()
);

const results = [];

services.forEach(service => {
    const useCasesPath = path.join(servicesDir, service, 'src', 'application', 'use-cases');
    
    if (!fs.existsSync(useCasesPath)) return;

    const useCaseFiles = fs.readdirSync(useCasesPath)
        .filter(f => f.endsWith('.use-case.ts') && !f.includes('.test.'));
    
    const testDir = path.join(useCasesPath, '__tests__');
    const testFiles = fs.existsSync(testDir) 
        ? fs.readdirSync(testDir).filter(f => f.endsWith('.test.ts'))
        : [];

    const testDetails = testFiles.map(testFile => {
        const content = fs.readFileSync(path.join(testDir, testFile), 'utf8');
        const testCount = (content.match(/\bit\(/g) || []).length;
        return { file: testFile, tests: testCount };
    });

    results.push({
        service,
        useCases: useCaseFiles.length,
        testFiles: testFiles.length,
        totalTests: testDetails.reduce((sum, t) => sum + t.tests, 0),
        details: testDetails
    });
});

console.log('\n=== SERVICE TEST COVERAGE ANALYSIS ===\n');

results.sort((a, b) => {
    const aAvg = a.totalTests / (a.testFiles || 1);
    const bAvg = b.totalTests / (b.testFiles || 1);
    return aAvg - bAvg;
});

results.forEach(r => {
    const coverage = r.testFiles === 0 ? 0 : ((r.testFiles / r.useCases) * 100).toFixed(0);
    const avgTests = r.testFiles === 0 ? 0 : (r.totalTests / r.testFiles).toFixed(1);
    const status = avgTests >= 5 ? '✅' : avgTests >= 3 ? '⚠️' : '❌';
    
    console.log(`${status} ${r.service.padEnd(30)} | Use Cases: ${r.useCases} | Test Files: ${r.testFiles} | Total Tests: ${r.totalTests} | Avg: ${avgTests}`);
    
    if (avgTests < 5 && r.testFiles > 0) {
        r.details.forEach(d => {
            if (d.tests < 5) {
                console.log(`   └─ ${d.file}: ${d.tests} test${d.tests !== 1 ? 's' : ''}`);
            }
        });
    }
});

console.log('\n=== LEGEND ===');
console.log('✅ Good (5+ tests per file)');
console.log('⚠️  Needs improvement (3-4 tests per file)');
console.log('❌ Poor (< 3 tests per file)\n');
