import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { Gpio } from 'pigpio';
import { writeFile, readFile } from 'fs/promises';
import * as flasher from 'lpc-flash';
import { Programmer } from 'lpc-flash';
import MemoryMap from 'nrf-intel-hex';
import { Readable } from 'stream';
import logger from './log';
import { sleep } from './util/sleep';
import {} from './main';
import { handleUpdate } from './main';
import { tmpdir } from 'os';

// "# Time,  Temp0, Temp1, Temp2, Temp3,  Set,Actual, Heat, Fan,  ColdJ, Mode"
// "   0.0,   31.5,  44.1,   0.0,   0.0,   50,  37.8,    0,   0,   31.5, STANDBY"
export type StatusUpdate = {
  realTime: number;
  time: number;
  temp0: number;
  temp1: number;
  temp2: number;
  temp3: number;
  set: number;
  actual: number;
  heat: number;
  fan: number;
  coldJ: number;
  mode: 'STANDBY' | 'REFLOW' | 'BAKE';
};

// "Starting reflow with profile: CUSTOM #2"
export type StartingReflow = {
  type: 'starting';
  profile: string;
};

// "Reflow interrupted by keypress"
export type InterruptedReflow = {
  type: 'interrupted';
};

export type UpdateFromDevice = StatusUpdate | StartingReflow | InterruptedReflow;

export function isStatusUpdate(update: UpdateFromDevice): update is StatusUpdate {
  return !('type' in update);
}
export function isStartingReflow(update: UpdateFromDevice): update is StartingReflow {
  if (isStatusUpdate(update)) return false;
  return update.type === 'starting';
}
export function isInterruptedReflow(update: UpdateFromDevice): update is InterruptedReflow {
  if (isStatusUpdate(update)) return false;
  return update.type === 'interrupted';
}

const outputPatterns = {
  update:
    /^\s*(?<time>[^\s,]+),\s*(?<temp0>[^\s,]+),\s*(?<temp1>[^\s,]+),\s*(?<temp2>[^\s,]+),\s*(?<temp3>[^\s,]+),\s*(?<set>[^\s,]+),\s*(?<actual>[^\s,]+),\s*(?<heat>[^\s,]+),\s*(?<fan>[^\s,]+),\s*(?<coldJ>[^\s,]+),\s*(?<mode>STANDBY|REFLOW|BAKE)$/,
};

let dataGood = false;

function handleLine(line: string) {
  if (line.startsWith('#')) {
    // Example: # Time,  Temp0, Temp1, Temp2, Temp3,  Set,Actual, Heat, Fan,  ColdJ, Mode
    // logger.info(line);
    return;
  }

  const match = outputPatterns.update.exec(line);
  if (match?.groups) {
    try {
      const update: UpdateFromDevice = {
        realTime: Date.now(),
        time: Number(match.groups.time),
        temp0: Number(match.groups.temp0),
        temp1: Number(match.groups.temp1),
        temp2: Number(match.groups.temp2),
        temp3: Number(match.groups.temp3),
        set: Number(match.groups.set),
        actual: Number(match.groups.actual),
        heat: Number(match.groups.heat),
        fan: Number(match.groups.fan),
        coldJ: Number(match.groups.coldJ),
        mode: match.groups.mode as 'STANDBY' | 'REFLOW' | 'BAKE',
      };
      dataGood = true;
      handleUpdate(update);
    } catch (e) {
      logger.error('Failed to handle update');
      logger.error(e);
      dataGood = false;
    }

    return;
  }

  logger.debug(line);

  // Example output lines from v0.5.2 startup:
  /*
  See https://github.com/UnifiedEngineering/T-962-improvement for more details.
  Initializing improved reflow oven...
  Reset reason(s): [EXTR]
  Running on an LPC2134(/01) rev F
  Waiting for keys to be released... Done!
  Buzzer_Init
  ADC_Init called
  OneWire_Init called
  Scanning 1-wire bus...
   Found e800000531213428 [DS18B20 Temperature sensor]
  SPI_TC_Init called
  SC18IS602B_Init - No chip found
   bake setpoint values: 0, 1e, 30
  SystemFan_Init
   bake setpoint values: 0, 1e, 30
  T-962-controller open source firmware (v0.5.2)
  See https://github.com/UnifiedEngineering/T-962-improvement for more details.
  Initializing improved reflow oven...
  Part number: LPC2134
  EEPROM contents:
  0x0000: ff ff 00 3c 00 41 00 46 00 4b 00 52 00 5a 00 64
  0x0010: 00 73 00 82 00 91 00 a0 00 af 00 be 00 c8 00 c8
  0x0020: 00 c8 00 c8 00 c8 00 c8 00 c8 00 c8 00 c8 00 c8
  0x0030: 00 d2 00 dc 00 e6 00 f0 00 fa 01 04 01 0e 01 0e
  0x0040: 01 0e 00 fa 00 d2 00 b4 00 96 00 82 00 6e 00 5a
  0x0050: 00 46 00 32 00 28 00 1e 00 14 00 14 00 14 00 00
  0x0060: 00 00 4a 57 09 05 00 64 64 64 64 15 00 1e ff ff
  0x0070: ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff
  0x0080: 56 57 00 23 00 2d 00 37 00 41 00 4b 00 55 00 5f
  0x0090: 00 6e 00 87 00 96 00 99 00 9c 00 9f 00 a2 00 a5
  0x00a0: 00 a8 00 ab 00 ad 00 af 00 b9 00 c3 00 cd 00 d7
  0x00b0: 00 e1 00 e6 00 eb 00 f0 00 f5 00 f5 00 f5 00 f0
  0x00c0: 00 d2 00 b9 00 96 00 78 00 64 00 50 00 3c 00 28
  0x00d0: 00 14 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x00e0: 00 00 00 00 31 6a 00 00 3b 5d 00 00 00 11 00 00
  0x00f0: 07 6f 00 00 40 00 00 00 f6 00 00 00 07 00 58 59
  Sensor values:
           Left: 31.0degC
          Right: 43.4degC
  Cold junction: 31.0degC
  Toggled standby logging
  */
}

const path = '/dev/serial0';

const piUART: 0 | 1 = 1;

const pinUartMode = piUART ? Gpio.ALT5 : Gpio.ALT0;

const programmingBaudRate = 57600;
const programmingClockFrequency = 11059;
const runtimeBaudRate = 115200;

// Time to hold reset low
const resetDuration = 100;

const pins = {
  isp: new Gpio(17, { mode: Gpio.OUTPUT }), // Yellow
  rst: new Gpio(18, { mode: Gpio.OUTPUT }), // Orange
  rxm: new Gpio(15, { mode: pinUartMode }), // Red
  txm: new Gpio(14, { mode: pinUartMode }), // Brown
};

let resetState: Promise<void> | undefined;
async function reset(bootloader = false, hold = false) {
  if (!resetState) {
    pins.rst.digitalWrite(0);
    resetState = sleep(resetDuration);
  }
  pins.isp.digitalWrite(bootloader ? 0 : 1);

  return run();
}
async function run() {
  await resetState;
  resetState = undefined;
  pins.rst.digitalWrite(1);
}

type SavedState = { version: string | undefined };
const ovenStateFile = tmpdir() + '/oven-state.json';
async function saveOvenState(state: SavedState) {
  await writeFile(ovenStateFile, JSON.stringify(state), 'utf8');

  logger.debug('Saved state');
}
async function loadOvenState(): Promise<SavedState | undefined> {
  const data = await readFile(ovenStateFile, 'utf8').then(JSON.parse, () => {});

  if (data?.version === 'v0.5.2') {
    return { version: data.version };
  }

  logger.debug('No saved state found');

  return undefined;
}

const port = new SerialPort({ path, baudRate: runtimeBaudRate });
const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

/*
Available commands:
- about                   Show about + debug information
- bake <setpoint>         Enter Bake mode with setpoint
- bake <setpoint> <time>  Enter Bake mode with setpoint for <time> seconds
- help                    Display help text
- list profiles           List available reflow profiles
- list settings           List machine settings
- quiet                   No logging in standby mode
- reflow                  Start reflow with selected profile
- setting <id> <value>    Set setting id to value
- select profile <id>     Select reflow profile by id
- stop                    Exit reflow or bake mode
- values                  Dump currently measured values
*/

type SimpleCommands = 'about' | 'help' | 'list profiles' | 'list settings' | 'quiet' | 'reflow' | 'stop' | 'values';
type BakeCommand = `bake ${number}` | `bake ${number} ${number}`;
type SettingCommand = `setting ${number} ${number}`;
type SelectProfileCommand = `select profile ${number}`;
type Command = SimpleCommands | BakeCommand | SettingCommand | SelectProfileCommand;
function sendCommand(command: Command, waitForSent = false) {
  return new Promise<void>((resolve, reject) =>
    port.write(command + '\n', 'ascii', err =>
      err ? reject(err) : waitForSent ? port.drain(err => (err ? reject(err) : resolve)) : resolve(),
    ),
  );
}

function setDataHandling(enabled: boolean) {
  if (enabled) {
    parser.on('data', handleLine);
  } else {
    parser.removeListener('data', handleLine);
  }
}

export async function setupOvenCommunications() {
  await recoverCommunications();

  // await sendCommand('values');
  // await sendCommand('help');
}

async function recoverCommunications() {
  logger.debug('Setting up oven communications...');

  const state = await loadOvenState();
  if (state?.version === 'v0.5.2') {
    // Loaded a good saved state. Let's try to use it.
    setDataHandling(true);

    // TODO: Ask for the current version and confirm that way instead of resetting/assuming it's good based on the line format.

    // TODO: Do something more elegant than this

    // Give it 5 seconds to get data
    const s = sleep(5000);

    // Quick check to see if we're getting data
    function checkData() {
      if (dataGood) s.cancel();

      return dataGood;
    }

    const checkTwice = () => checkData() || parser.once('data', checkData);

    // Check twice quickly, in case the first line was garbage.
    parser.once('data', checkTwice);

    await s;
    if (dataGood) {
      logger.info('Successfully recovered oven state');

      return;
    }

    setDataHandling(false);
  }

  await resetToKnownState();

  setDataHandling(true);

  logger.info('Starting oven communications...');

  run();

  await sleep(500);

  // Start printing values during standby
  await sendCommand('quiet');

  // TODO: Do something more elegant than this

  const s = sleep(5000);
  // Quick check to see if we're getting data
  function checkData() {
    if (dataGood) s.cancel();

    return dataGood;
  }

  const checkTwice = () => checkData() || parser.once('data', checkData);
  parser.once('data', checkTwice);

  await s;

  if (dataGood) {
    logger.info('Oven communications started!');
    saveOvenState({ version: 'v0.5.2' });
  } else {
    logger.error('Failed to start oven communications?');
  }
}

export async function resetToKnownState() {
  logger.info('Resetting oven to known state...');

  saveOvenState({ version: undefined });

  await reset();

  // First, let's make sure we're running the latest version.
  const version = await new Promise<string | void>(async resolve => {
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
        logger.debug(`Received: ${line}`);
        return;
      }

      const { version } = match.groups;

      logger.info(`Found version ${version}`);

      done(version);
    }

    parser.on('data', getVersion);

    logger.debug('Sending about command...');
    await sendCommand('about');

    // logger.debug('Sending help command...');
    // await sendCommand('help');

    // Wait for response
    timeout = setTimeout(() => {
      logger.warn('Timeout waiting for version');
      done();
    }, 1000);
  });

  // TODO: Load latest firmware from github
  if (version !== 'v0.5.2') {
    logger.info('Updating to latest firmware...');

    const isp = new flasher.InSystemProgramming(path, programmingBaudRate, programmingClockFrequency, logger);

    logger.debug('Downloading hex file...');
    const hexUrl =
      'https://github.com/UnifiedEngineering/T-962-improvements/releases/download/v0.5.2/T-962-controller.hex';

    const res = await fetch(hexUrl);
    if (!res.body) throw new Error('No body');
    if (!res.ok || res.status !== 200) throw new Error(`Bad response: ${res.status} ${res.statusText}`);

    logger.debug('Parsing hex file...');

    const memMap: Map<number, Uint8Array> = MemoryMap.fromHex(await res.text());

    logger.debug('Updating firmware...');

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

    // Ensure we can talk to the device
    await flasher.handshake(isp);

    // Flash new firmware, one section of the hex file at a time
    for (const [address, data] of memMap.entries()) {
      await new Promise<void>(async (resolve, reject) => {
        logger.debug(`Downloading ${data.length} bytes to address ${address}...`);
        logger.debug(`First 16 bytes: ${data.slice(0, 16).join(' ')}`);

        const programmer = new Programmer(isp, address, data.length);

        // Error and completion
        programmer.on('error', reject);
        programmer.on('end', resolve);

        // Progress
        let count = 0;
        programmer.on('start', () => logger.debug(`About to flash new hex...`));
        programmer.on('chunk', buffer => (count += buffer.length));
        programmer.on('end', () => logger.debug(`${count} bytes written to flash`));

        // Start programming
        programmer.program(Readable.from(data));
      });
    }

    // Close programmer port
    await isp.close();

    // Leave bootloader
    pins.isp.digitalWrite(1);

    // Reset device
    pins.rst.digitalWrite(0);
    await sleep(resetDuration);

    logger.info('Done with flasher');

    // Re-open user port
    await new Promise<void>((resolve, reject) => port.open(err => (err ? reject(err) : resolve())));
  }
}

// cSpell:ignore setpoint
