import * as React from 'react';
import { runApp } from '@cinderblock/react-backend';

console.log('Hello React backend!');

runApp(<Toaster />);

function Toaster() {
  return (
    <>
      <OvenConnection port="/dev/ttyUSB0" />
      <HttpServer port={8080}>
        <WebSocket url="/ws" />
        <StaticFiles />
      </HttpServer>
    </>
  );
}
