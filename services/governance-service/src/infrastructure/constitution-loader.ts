import fs from 'fs';

import { ConstitutionDocument } from '../domain/governance.types';

export function loadConstitution(constitutionPath: string): ConstitutionDocument {
  const raw = fs.readFileSync(constitutionPath, 'utf8');
  return JSON.parse(raw) as ConstitutionDocument;
}

