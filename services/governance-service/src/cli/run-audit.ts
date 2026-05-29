import { createGovernanceServiceEnvironment } from '../bootstrap';

async function main(): Promise<void> {
  const { runner, config } = createGovernanceServiceEnvironment();
  const report = await runner.run(config);

  console.log(JSON.stringify({
    runId: report.runId,
    constitutionVersion: report.constitutionVersion,
    targetPhase: report.targetPhase,
    verdict: report.verdict,
    summary: report.summary,
    phaseCertifications: report.phaseCertifications,
    latestReportPath: `${config.reportDir}\\latest.json`
  }, null, 2));

  if (report.verdict === 'DENIED') {
    process.exitCode = 1;
  }
}

void main();
