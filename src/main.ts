import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

const port = new SerialPort({ path: '/dev/serial0', baudRate: 115200 });

const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

parser.on('data', line => {
  if (line.startsWith('#')) {
    console.log(line);
    return;
  }

  console.log(line);
});

console.log('Dashboard main');

// port.write('quiet\n');
port.write('values\n');

async function main() {
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('alive!');
  }
}

main();

//    0.0,   31.5,  44.2,   0.0,   0.0,   50,  37.8,    0,   0,   31.5, STANDBY
//    0.0,   31.5,  44.1,   0.0,   0.0,   50,  37.8,    0,   0,   31.5, STANDBY
//    0.0,   31.5,  44.1,   0.0,   0.0,   50,  37.8,    0,   0,   31.5, STANDBY
//    0.0,   31.5,  44.1,   0.0,   0.0,   50,  37.8,    0,   0,   31.5, STANDBY
// Starting reflow with profile: CUSTOM #2
// # Time,  Temp0, Temp1, Temp2, Temp3,  Set,Actual, Heat, Fan,  ColdJ, Mode
//    0.0,   31.5,  43.9,   0.0,   0.0,   35,  37.7,    0, 255,   31.5, REFLOW
// Reflow interrupted by keypress
// # Time,  Temp0, Temp1, Temp2, Temp3,  Set,Actual, Heat, Fan,  ColdJ, Mode
//    0.0,   31.5,  44.1,   0.0,   0.0,   50,  37.8,    0,   0,   31.5, STANDBY
//    0.0,   31.5,  44.1,   0.0,   0.0,   50,  37.8,    0,   0,   31.5, STANDBY
//    0.0,   31.5,  44.1,   0.0,   0.0,   50,  37.8,    0,   0,   31.5, STANDBY
//    0.0,   31.5,  44.2,   0.0,   0.0,   50,  37.8,    0,   0,   31.5, STANDBY
//    0.0,   31.0,  43.7,   0.0,   0.0,   50,  37.3,    0,   0,   31.0, STANDBY

// T-962-controller open source firmware (v0.5.1)
// See https://github.com/UnifiedEngineering/T-962-improvement for more details.
// Initializing improved reflow oven...
