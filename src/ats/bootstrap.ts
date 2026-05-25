// Registers every shipped adapter with the registry. Import once from the
// root layout so the registry is populated before any UI code reads it.
//
// Adding a new ATS: import the adapter and call registerAdapter below.

import { greenhouseAdapter } from './adapters/greenhouse';
import { mockAdapter } from './adapters/mock';
import { registerAdapter } from './registry';

let bootstrapped = false;

export function bootstrapAdapters(): void {
  if (bootstrapped) return;
  registerAdapter(mockAdapter);
  registerAdapter(greenhouseAdapter);
  bootstrapped = true;
}
