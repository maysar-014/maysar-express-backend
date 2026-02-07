import * as fs from 'fs';
import * as path from 'path';

interface AuditResult {
    serviceName: string;
    hasModelingDir: boolean;
    hasStateMachines: boolean;
    hasSequenceDiagrams: boolean;
    hasUseCases: boolean;
    hasReadme: boolean;
    sagaCount: number;
    diagramCount: number;
    issues: string[];
}

const SERVICES_DIR = path.join(__dirname, '../services');
const REQUIRED_SUBDIRS = ['state-machines', 'sequence', 'use-cases'];

async function auditService(servicePath: string): Promise<AuditResult> {
    const serviceName = path.basename(servicePath);
    const modelingPath = path.join(servicePath, 'docs/modeling');
    const result: AuditResult = {
        serviceName,
        hasModelingDir: false,
        hasStateMachines: false,
        hasSequenceDiagrams: false,
        hasUseCases: false,
        hasReadme: false,
        sagaCount: 0,
        diagramCount: 0,
        issues: []
    };

    // Check if modeling directory exists
    if (!fs.existsSync(modelingPath)) {
        result.issues.push('Missing docs/modeling directory');
        return result;
    }
    result.hasModelingDir = true;

    // Check subdirectories
    const stateMachinesPath = path.join(modelingPath, 'state-machines');
    const sequencePath = path.join(modelingPath, 'sequence');
    const useCasesPath = path.join(modelingPath, 'use-cases');

    result.hasStateMachines = fs.existsSync(stateMachinesPath) &&
        fs.readdirSync(stateMachinesPath).filter(f => f.endsWith('.mmd')).length > 0;

    result.hasSequenceDiagrams = fs.existsSync(sequencePath) &&
        fs.readdirSync(sequencePath).filter(f => f.endsWith('.mmd')).length > 0;

    result.hasUseCases = fs.existsSync(useCasesPath) &&
        fs.readdirSync(useCasesPath).filter(f => f.endsWith('.mmd')).length > 0;

    // Check README
    const readmePath = path.join(modelingPath, 'README.md');
    result.hasReadme = fs.existsSync(readmePath);
    if (result.hasReadme) {
        const readmeContent = fs.readFileSync(readmePath, 'utf-8');
        if (readmeContent.includes('TODO') || readmeContent.includes('placeholder')) {
            result.issues.push('README contains placeholder content');
        }
    } else {
        result.issues.push('Missing README.md');
    }

    // Count sagas
    const sagasPath = path.join(servicePath, 'src/application/sagas');
    if (fs.existsSync(sagasPath)) {
        result.sagaCount = fs.readdirSync(sagasPath)
            .filter(f => f.endsWith('.saga.ts')).length;
    }

    // Count diagrams
    if (fs.existsSync(sequencePath)) {
        result.diagramCount = fs.readdirSync(sequencePath)
            .filter(f => f.endsWith('.mmd')).length;
    }

    // Check if all sagas have diagrams
    if (result.sagaCount > 0 && result.diagramCount < result.sagaCount) {
        result.issues.push(`${result.sagaCount} sagas but only ${result.diagramCount} sequence diagrams`);
    }

    return result;
}

async function validateDiagrams(): Promise<void> {
    console.log('🔍 Validating modeling diagrams across all services...\n');

    const services = fs.readdirSync(SERVICES_DIR)
        .filter(name => fs.statSync(path.join(SERVICES_DIR, name)).isDirectory());

    const results: AuditResult[] = [];
    let compliantCount = 0;
    let partialCount = 0;
    let nonCompliantCount = 0;

    for (const service of services) {
        const servicePath = path.join(SERVICES_DIR, service);
        const result = await auditService(servicePath);
        results.push(result);

        // Determine compliance level
        // Fully compliant: has README, has diagrams, AND (no sagas OR sagas match diagrams exactly)
        const hasExactMatch = result.sagaCount === 0 || result.sagaCount === result.diagramCount;

        if (result.issues.length === 0 &&
            result.hasModelingDir &&
            result.hasReadme &&
            hasExactMatch &&
            (result.hasSequenceDiagrams || result.hasStateMachines || result.hasUseCases)) {
            compliantCount++;
            console.log(`✅ ${service}`);
        } else if (result.hasModelingDir && result.hasReadme &&
            (result.hasSequenceDiagrams || result.hasStateMachines || result.hasUseCases)) {
            partialCount++;
            console.log(`⚠️  ${service}`);
            result.issues.forEach(issue => console.log(`   - ${issue}`));
        } else {
            nonCompliantCount++;
            console.log(`❌ ${service}`);
            result.issues.forEach(issue => console.log(`   - ${issue}`));
        }
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`Total Services: ${services.length}`);
    console.log(`✅ Fully Compliant: ${compliantCount}`);
    console.log(`⚠️  Partially Compliant: ${partialCount}`);
    console.log(`❌ Non-Compliant: ${nonCompliantCount}`);

    // Exit with error if any service is non-compliant
    if (nonCompliantCount > 0 || partialCount > 0) {
        console.log('\n⛔ Some services have modeling issues. Please address them.');
        process.exit(1);
    } else {
        console.log('\n✨ All services are compliant!');
        process.exit(0);
    }
}

validateDiagrams().catch(error => {
    console.error('Error running validation:', error);
    process.exit(1);
});
