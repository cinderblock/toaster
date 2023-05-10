import * as React from 'react';

import { createRoot } from 'react-dom/client';
import App from './app';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

// Clear the existing HTML content
document.body.innerHTML = '<div id="app"></div>';

if (true) new EventSource('/esbuild').addEventListener('change', () => location.reload());

console.log('Hello browser!');

// Render your React component instead
const root = createRoot(document.getElementById('app'));
root.render(<App />);
