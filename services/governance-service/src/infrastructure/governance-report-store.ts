import fs from 'fs';
import path from 'path';

import { InspectionRun, RunIndexEntry } from '../domain/governance.types';

function ensureDirectory(directoryPath: string): void {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

function safeReadJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export class GovernanceReportStore {
  constructor(private readonly reportDir: string) {}

  private get runsDirectory(): string {
    return path.join(this.reportDir, 'runs');
  }

  private get indexPath(): string {
    return path.join(this.reportDir, 'index.json');
  }

  listRuns(): RunIndexEntry[] {
    const index = safeReadJson<RunIndexEntry[]>(this.indexPath);
    if (index) {
      return index.sort((left, right) => right.startedAt.localeCompare(left.startedAt));
    }

    if (!fs.existsSync(this.runsDirectory)) {
      return [];
    }

    const runsDirectory = path.join(this.reportDir, 'runs');
    return fs
      .readdirSync(runsDirectory)
      .filter(fileName => fileName.endsWith('.json'))
      .map(fileName => this.getRun(fileName.replace(/\.json$/i, '')))
      .filter((run): run is InspectionRun => run !== null)
      .map(run => this.toIndexEntry(run))
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  }

  getLatestRun(): InspectionRun | null {
    const latestPath = path.join(this.reportDir, 'latest.json');
    if (!fs.existsSync(latestPath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(latestPath, 'utf8')) as InspectionRun;
  }

  getRun(runId: string): InspectionRun | null {
    const runPath = path.join(this.runsDirectory, `${runId}.json`);
    return safeReadJson<InspectionRun>(runPath);
  }

  getEvidence(runId: string, gateId: string) {
    const run = this.getRun(runId);
    if (!run) {
      return null;
    }

    const gateResult = run.gateResults.find(result => result.gateId === gateId);
    if (!gateResult) {
      return null;
    }

    return {
      runId,
      gateId,
      title: gateResult.title,
      severity: gateResult.severity,
      status: gateResult.status,
      summary: gateResult.summary,
      evidence: gateResult.evidence,
      startedAt: gateResult.startedAt,
      finishedAt: gateResult.finishedAt,
      durationMs: gateResult.durationMs
    };
  }

  saveRun(run: InspectionRun): InspectionRun {
    ensureDirectory(this.runsDirectory);
    ensureDirectory(this.reportDir);
    fs.writeFileSync(path.join(this.runsDirectory, `${run.runId}.json`), JSON.stringify(run, null, 2));
    fs.writeFileSync(path.join(this.reportDir, 'latest.json'), JSON.stringify(run, null, 2));
    const existingIndex = this.listRuns().filter(entry => entry.runId !== run.runId);
    existingIndex.unshift(this.toIndexEntry(run));
    fs.writeFileSync(this.indexPath, JSON.stringify(existingIndex, null, 2));
    return run;
  }

  private toIndexEntry(run: InspectionRun): RunIndexEntry {
    return {
      runId: run.runId,
      constitutionVersion: run.constitutionVersion,
      targetPhase: run.targetPhase,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      verdict: run.verdict,
      summary: run.summary
    };
  }
}
