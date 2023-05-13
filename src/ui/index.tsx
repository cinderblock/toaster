import * as React from 'react';

import { createRoot } from 'react-dom/client';
import App from './app';
import { setupWebSocket } from './websocket';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

if (true) new EventSource('/esbuild').addEventListener('change', () => location.reload());

setupWebSocket().catch(e => {
  console.error('Failed to connect to WebSocket, reload page...');
  console.error(e);
});

console.log('Hello browser!');

// Clear the existing HTML content
document.body.innerHTML = '<div id="app"></div>';

// Render your React component instead
const root = createRoot(document.getElementById('app')!);
root.render(<App />);
