import { createClient } from 'redis';
import { getType } from './EnvironmentData';

export function subForTokenChanged() {
  if (getType()) {
    const sub = createClient();
    sub.on('message', (channel, message) => {
      process.exit(1);
    });
    sub.subscribe(`${getType()}tokenAddedChan`);
  }
}
