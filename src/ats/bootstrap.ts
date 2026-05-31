// Registers every shipped adapter with the registry. Import once from the
// root layout so the registry is populated before any UI code reads it.
//
// Adding a new ATS: import the adapter and call registerAdapter below.

import { ashbyAdapter } from './adapters/ashby';
import { bamboohrAdapter } from './adapters/bamboohr';
import { greenhouseAdapter } from './adapters/greenhouse';
import { icimsAdapter } from './adapters/icims';
import { indeedAdapter } from './adapters/indeed';
import { jazzhrAdapter } from './adapters/jazzhr';
import { leverAdapter } from './adapters/lever';
import { manatalAdapter } from './adapters/manatal';
import { mockAdapter } from './adapters/mock';
import { recruiteeAdapter } from './adapters/recruitee';
import { smartrecruitersAdapter } from './adapters/smartrecruiters';
import { teamtailorAdapter } from './adapters/teamtailor';
import { workableAdapter } from './adapters/workable';
import { workdayAdapter } from './adapters/workday';
import { ziprecruiterAdapter } from './adapters/ziprecruiter';
import { registerAdapter } from './registry';

let bootstrapped = false;

export function bootstrapAdapters(): void {
  if (bootstrapped) return;
  // Real adapters (have working Deno clients).
  registerAdapter(mockAdapter);
  registerAdapter(greenhouseAdapter);
  registerAdapter(ashbyAdapter);
  registerAdapter(leverAdapter);
  registerAdapter(workableAdapter);
  registerAdapter(recruiteeAdapter);
  // Capability-only shells (no Deno client yet — methods throw).
  registerAdapter(smartrecruitersAdapter);
  registerAdapter(workdayAdapter);
  registerAdapter(bamboohrAdapter);
  registerAdapter(jazzhrAdapter);
  registerAdapter(teamtailorAdapter);
  registerAdapter(icimsAdapter);
  registerAdapter(manatalAdapter);
  // Partner-gated job-board shells.
  registerAdapter(indeedAdapter);
  registerAdapter(ziprecruiterAdapter);
  bootstrapped = true;
}
