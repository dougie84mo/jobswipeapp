// Registers every shipped adapter with the registry. Import once from the
// root layout so the registry is populated before any UI code reads it.
//
// Adding a new ATS: import the adapter and call registerAdapter below.

import { ashbyAdapter } from './adapters/ashby';
import { greenhouseAdapter } from './adapters/greenhouse';
import { indeedAdapter } from './adapters/indeed';
import { leverAdapter } from './adapters/lever';
import { mockAdapter } from './adapters/mock';
import { recruiteeAdapter } from './adapters/recruitee';
import { workableAdapter } from './adapters/workable';
import { ziprecruiterAdapter } from './adapters/ziprecruiter';
import { registerAdapter } from './registry';

let bootstrapped = false;

export function bootstrapAdapters(): void {
  if (bootstrapped) return;
  registerAdapter(mockAdapter);
  registerAdapter(greenhouseAdapter);
  registerAdapter(ashbyAdapter);
  registerAdapter(leverAdapter);
  registerAdapter(workableAdapter);
  registerAdapter(recruiteeAdapter);
  registerAdapter(indeedAdapter);
  registerAdapter(ziprecruiterAdapter);
  bootstrapped = true;
}
