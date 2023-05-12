import * as React from 'react';

import { createRoot } from 'react-dom/client';
import App from './app';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

if (true) new EventSource('/esbuild').addEventListener('change', () => location.reload());

// connect to /ws WebSocket endpoint
const ws = new WebSocket(`ws://${location.host}/ws`);

ws.onopen = () => {
  console.log('Connected to /ws WebSocket endpoint');
};

ws.onmessage = message => {
  console.log('Received message from /ws WebSocket endpoint', message);
};

ws.addEventListener('message', message => {
  console.log('Received message from /ws WebSocket endpoint', message);
});

ws.onclose = () => {
  console.log('Disconnected from /ws WebSocket endpoint');
};

console.log('Hello browser!');

// Clear the existing HTML content
document.body.innerHTML = '<div id="app"></div>';

// Render your React component instead
const root = createRoot(document.getElementById('app')!);
root.render(<App />);
