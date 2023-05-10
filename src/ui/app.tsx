import * as React from 'react';
import * as Server from 'react-dom/server';

if (true) new EventSource('/esbuild').addEventListener('change', () => location.reload());

console.log('Hello browser!');

let Greet = () => <h1>Hello, world!</h1>;
console.log(Server.renderToString(<Greet />));
