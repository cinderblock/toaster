import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import * as flasher from 'lpc-flash';
import { Programmer } from 'lpc-flash';
import { Gpio } from 'pigpio';
import MemoryMap from 'nrf-intel-hex';
import { Readable } from 'stream';

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

const logger = {
  info(...args: any[]) {
    // console.log(...args);
  },
  warn(...args: any[]) {
    // console.warn(...args);
  },
};

async function main() {
  const port = new SerialPort({ path, baudRate: runtimeBaudRate });
  const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
  const isp = new flasher.InSystemProgramming(path, programmingBaudRate, programmingClockFrequency, logger);

  console.log('Starting...');

  pins.rst.digitalWrite(0);
  pins.isp.digitalWrite(1);
  await sleep(resetDuration);
  pins.rst.digitalWrite(1);

  console.log('Reset');

  // First, let's make sure we're running the latest version.

  const version = await new Promise<string | void>(resolve => {
    let timeout: NodeJS.Timeout;

    // Cleanup and resolve
    function done(version?: string) {
      clearTimeout(timeout);
      parser.removeListener('data', getVersion);
      resolve(version);
    }

    function getVersion(line: string) {
      // extract version number

      const match = line.match(/T-962-controller open source firmware \((?<version>v\d+.\d+.\d+)\)/);

      if (!match?.groups) {
        console.log(`Received: ${line}`);
        return;
      }

      const { version } = match.groups;

      console.log(`Found version ${version}`);

      done(version);
    }

    parser.on('data', getVersion);

    console.log('Sending about command...');
    // Send command
    port.write('about\n');

    // Wait for response
    timeout = setTimeout(() => {
      console.log('Timeout waiting for version');
      done();
    }, 2000);
  });

  // TODO: Load latest firmware from github
  if (version !== 'v0.5.2') {
    console.log('Updating firmware...');
    const hexUrl =
      'https://github.com/UnifiedEngineering/T-962-improvements/releases/download/v0.5.2/T-962-controller.hex';

    const res = await fetch(hexUrl);
    if (!res.body) throw new Error('No body');
    if (!res.ok || res.status !== 200) throw new Error(`Bad response: ${res.status} ${res.statusText}`);

    const memMap: Map<number, Uint8Array> = MemoryMap.fromHex(await res.text());

    // Put device into reset
    pins.rst.digitalWrite(0);

    // Close user port
    await new Promise<void>((resolve, reject) => port.close(err => (err ? reject(err) : resolve())));

    // Start bootloader when device comes out of reset
    pins.isp.digitalWrite(0);

    await sleep(resetDuration);

    // Come out of reset
    pins.rst.digitalWrite(1);

    // Connect programmer port
    await isp.open();

    await flasher.handshake(isp);

    // Flash new firmware

    for (const [address, data] of memMap.entries()) {
      await new Promise<void>(async (resolve, reject) => {
        console.log(`Downloading ${data.length} bytes to address ${address}...`);
        console.log(`First 16 bytes: ${data.slice(0, 16).join(' ')}`);

        let count = 0;
        const programmer = new Programmer(isp, address, data.length);
        programmer
          .program(Readable.from(Buffer.from(data)))
          .on('start', () => console.log(`About to flash new hex...`))
          .on('chunk', buffer => {
            count += buffer.length;
          })
          .on('error', reject)
          .on('end', () => {
            console.log(`${count} bytes written to flash`);
            resolve();
          });
      });
    }

    // Close programmer port
    await isp.close();

    pins.isp.digitalWrite(1);

    pins.rst.digitalWrite(0);
    await sleep(resetDuration);
    pins.rst.digitalWrite(1);

    console.log('Done with flasher');

    await new Promise<void>((resolve, reject) => port.open(err => (err ? reject(err) : resolve())));
  }

  parser.on('data', line => {
    if (line.startsWith('#')) {
      // console.log(line);
      return;
    }

    // console.log(line);
  });

  console.log('Dashboard main');

  await sleep(5000);

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
