import * as React from 'react';

import { State } from '../state';

import { createRoot } from 'react-dom/client';
import App from './app';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { StatusUpdate } from '../oven';

if (true) new EventSource('/esbuild').addEventListener('change', () => location.reload());

// connect to /ws WebSocket endpoint
const ws = new WebSocket(`ws://${location.host}/ws`);

ws.onopen = () => {
  console.log('Connected to /ws WebSocket endpoint');
};

function isStateUpdate(message: any): message is { state: State } {
  // TODO: actually validate the data
  return typeof message === 'object' && message !== null && 'state' in message;
}

function isUpdate(message: any): message is { update: StatusUpdate } {
  // TODO: actually validate the data
  return typeof message === 'object' && message !== null && 'update' in message;
}

function updateToString(update: StatusUpdate) {
  return Object.entries(update)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

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

ws.onclose = () => {
  console.log('Disconnected from /ws WebSocket endpoint');
  // TODO: reconnect
};

console.log('Hello browser!');

// Clear the existing HTML content
document.body.innerHTML = '<div id="app"></div>';

// Render your React component instead
const root = createRoot(document.getElementById('app')!);
root.render(<App />);
