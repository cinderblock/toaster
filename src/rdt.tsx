import * as React from 'react';
import { runApp } from '@cinderblock/react-backend';

runApp(<RDT />);

function RDT() {
  return (
    <>
      <RemoteControl remote={{}}>
        <Systemd.Service name="toaster" description="Toaster Service">
          /usr/bin/node /home/pi/toaster.js
        </Systemd.Service>
        <AptPackages>
          <Apt.Source url="https://deb.nodesource.com/node_18.x" />
          <Apt.Package name="nodejs" />
        </AptPackages>
        <Deploy path="/home/pi/toaster.js" />
      </RemoteControl>
      <Build src="src/" />
      <BuildUI src="src/ui/" />
      <DevServer port={8080}>
        <Proxy url="/ws" ws />
        <StaticFiles path="local/folder" />
      </DevServer>
    </>
  );
}
