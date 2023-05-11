import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import flasher from 'lpc-flash';
import { Gpio } from 'pigpio';

const path = '/dev/serial0';

const piUART: 0 | 1 = 1;

const pinUartMode = piUART ? Gpio.ALT5 : Gpio.ALT0;

const programmingBaudRate = 57600;
const programmingClockFrequency = 11059;
const runtimeBaudRate = 115200;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const resetDuration = 100;

const pins = {
  isp: new Gpio(17, { mode: Gpio.OUTPUT }), // Yellow
  rst: new Gpio(18, { mode: Gpio.OUTPUT }), // Orange
  rxm: new Gpio(15, { mode: pinUartMode }), // Red
  txm: new Gpio(14, { mode: pinUartMode }), // Brown
};

async function main() {
  const isp = new flasher.InSystemProgramming(path, programmingBaudRate, programmingClockFrequency);

  pins.rst.digitalWrite(0);
  pins.isp.digitalWrite(0);

  await sleep(resetDuration);

  pins.rst.digitalWrite(1);

  await isp.open();

  await flasher.handshake(isp);

  await isp.close();

  pins.isp.digitalWrite(1);

  pins.rst.digitalWrite(0);
  await sleep(resetDuration);
  pins.rst.digitalWrite(1);

  console.log('Done with flasher');

  const port = new SerialPort({ path, baudRate: runtimeBaudRate });

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
