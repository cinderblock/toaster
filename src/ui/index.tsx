import * as React from 'react';

import { createRoot } from 'react-dom/client';
import App from './app';

// Clear the existing HTML content
document.body.innerHTML = '<div id="app"></div>';

if (true) new EventSource('/esbuild').addEventListener('change', () => location.reload());

console.log('Hello browser!');

// Render your React component instead
const root = createRoot(document.getElementById('app'));
root.render(<App />);
