import { State } from '../state';

import { StatusUpdate } from '../oven';

function isStateUpdate(message: any): message is { state: State } {
  // TODO: actually validate the data
  return typeof message === 'object' && message !== null && 'state' in message;
}

function isUpdate(message: any): message is { update: StatusUpdate } {
  // TODO: actually validate the data
  return typeof message === 'object' && message !== null && 'update' in message;
}

// Temporary print function
function updateToString(update: StatusUpdate) {
  return Object.entries(update)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

export async function setupWebSocket() {
  while (true) {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://${location.host}/ws`);

      ws.onopen = () => console.log('Connected to /ws WebSocket endpoint');

      ws.onmessage = (message: MessageEvent<string>) => {
        // console.log('Received message from /ws WebSocket endpoint', message);

        const { data: json } = message;

        const payload = JSON.parse(json);

        if (isStateUpdate(payload)) {
          const {
            state: { status, activeProfile },
          } = payload;
          console.log('Received state update', status.length, activeProfile);
          console.log('Status', updateToString(status[0]));
        } else if (isUpdate(payload)) {
          const { update } = payload;
          console.log('Received update', updateToString(update));
        } else {
          console.error('Unknown message type', payload);
        }
      };

      ws.onerror = reject;
      ws.onclose = resolve;
    }).catch(e => {
      console.error('WebSocket error', e);
    });
  }
}
