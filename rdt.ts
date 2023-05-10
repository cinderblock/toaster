import { Target, logger, BuildAndDeploy, Targets, SerialPortMode } from '@cinderblock/rdt';
import { transform, TransformOptions } from 'esbuild';
import { readFile } from 'fs/promises';

function posixPath(path: string) {
  return path.replace(/\\/g, '/');
}

// TODO: use config.remote.path instead
const remoteDir = 'toaster';

// name of systemd service
const serviceName = 'toaster';

// Control enabling of inspector on remote main process
const inspector = false;

const handler: BuildAndDeploy = {
  async onConnected({ rdt }) {
    const { targetName, targetConfig, connection } = rdt;

    if (!targetConfig.remote) {
      throw new Error(`No remote config for target: ${targetName}`);
    }

    logger.info(`connected to: ${targetName} [${targetConfig.remote.host}]`);

    // const conn = new Client();
    // conn.on('ready', () => {
    //   logger.info(`SSH ready`);
    //   const s = new SFTP(conn);
    //   conn.sftp((err, sftp) => {});
    // });
    // conn.connect(targetConfig.remote);

    // Setup dependencies on remote that are required to run the app

    const lock = await rdt.reduceWork.checkAndGetLock('apt-packages');
    if (lock) {
      await rdt.apt.update();
      await rdt.apt.install(['git', 'libpigpio-dev']);

      // Workaround https://github.com/fivdi/pigpio/issues/136
      await rdt.apt.remove(['pigpiod']);
      await rdt.run('ln -snf /usr/bin/false /usr/local/bin/pigpiod');

      lock();
    } else {
      logger.info(`Skipping apt update/install since it was already done recently`);
    }

    // Set correct serial port mode
    if ((await rdt.fs.readFile('/boot/cmdline.txt'))?.toString().includes('console=serial0')) {
      // Before settings:
      // /dev/serial1 -> ttyAMA0
      // /boot/cmdline.txt includes console=serial0,115200

      await rdt.raspberryPi.config.setSerialPortMode(SerialPortMode.serial);
      await rdt.run('reboot', [], { sudo: true });

      // After settings:
      // /dev/serial0 -> ttyS0
      // /dev/serial1 -> ttyAMA0
      // /boot/cmdline.txt doesn't include console=serial0,115200

      return;

      // TODO: Test/handle reboot gracefully and reconnect
    }

    let bin = await rdt.node.getPath();

    if (!bin) {
      await rdt.node.install();
      bin = await rdt.node.getPath();
      if (!bin) throw new Error(`Failed to install node`);
    }

    const execStart = [bin];

    // execStart.push('--enable-source-maps');

    execStart.push(`/home/pi/${remoteDir}`);

    await rdt.systemd.service.setup(
      serviceName,
      {
        Unit: {
          Description: 'Toaster Daemon',
        },
        Service: {
          ExecStart: execStart.join(' '),
        },
        Install: {
          WantedBy: 'multi-user.target',
        },
      },
      {},
    );

    rdt.systemd.journal
      .follow(serviceName)
      .catch(e => {
        logger.error(`Failed to follow journal: ${e.message}`);
      })
      .then(() => {
        logger.info(`Done following?`);
      });

    if (inspector) {
      await rdt.systemd.service.stop(serviceName);
      rdt.forward
        .toRemoteTarget(9229)
        .catch(e => logger.error(`Failed to forward port 9229 to remote target: ${e.message}`))
        .then(() => logger.info(`Done forwarding?`));
    }

    logger.info(`Done with onConnected`);
  },

  async onFileChanged({ rdt, localPath, info }) {
    logger.debug(`file changed: ${localPath}`);
    // logger.debug(`  ${info?.eventType} ${info?.filename}`);

    const localPathSanitized = posixPath(localPath);

    if (localPathSanitized.startsWith('examples/')) {
      // Skipping examples
      return;
    }

    if (localPathSanitized == 'package.json') {
      const pack = await readFile('package.json').then(b => JSON.parse(b.toString()));

      logger.debug('Read package.json');
      logger.debug(pack);

      const outFile = remoteDir + '/package.json';

      // Don't install devDependencies on remote
      delete pack.devDependencies;

      const change = await rdt.fs.ensureFileIs(outFile, JSON.stringify(pack, null, 2));

      return change ? outFile : undefined;
    }

    if (localPathSanitized.match(/\.tsx?$/)) {
      const remotePath = remoteDir + '/' + localPathSanitized.replace(/\.tsx?$/, '.js');

      const opts: TransformOptions = {
        loader: 'ts',
        target: 'es2019',
        sourcemap: 'inline',
        sourcefile: localPathSanitized.replace(/^.*\//, ''),
        sourcesContent: false,
      };

      if (localPathSanitized.startsWith('src/ui/')) {
        // TODO: Bundle?
        return;

        opts.loader = 'tsx';
        opts.target = 'esnext';
      }

      const { code, map } = await transform(await readFile(localPath), opts);

      const changedFiles: string[] = [];

      await Promise.all(
        [
          [remotePath, code],
          // [remotePath + '.map', map],
        ].map(async ([path, str]) => {
          // await writeFile('.build/' + path, str);
          if (await rdt.fs.ensureFileIs(path, str)) changedFiles.push(path);
          logger.info(`deployed: ${path} bytes: ${str.length}`);
        }),
      );

      return { changedFiles };
    }

    // No changes
  },

  async onDeployed({ rdt, changedFiles }) {
    const { targetName, targetConfig, connection } = rdt;

    logger.info(`deployed to: ${targetName}`);

    if (changedFiles.length > 10) {
      logger.info(`  ${changedFiles.length} files changed`);
    } else {
      logger.info(`  ${changedFiles.join(', ')}`);
    }

    const tasks: Promise<unknown>[] = [];

    if (changedFiles.includes(remoteDir + '/package.json'))
      tasks.push(rdt.run('npm install', [], { workingDirectory: remoteDir }));

    await Promise.all(tasks);

    // TODO: Restart app
    await rdt.systemd.service.restart(serviceName);

    if (inspector) {
      const pid = await rdt.systemd.service.show(serviceName, 'MainPID');
      await rdt.run('kill -SIGUSR1', [pid], { sudo: true });
    }
  },
};

export const defaultTarget = 'hotpi';

const hotpi: Target = {
  handler,
  devServer: {
    entry: 'src/ui/app.tsx',
    serveLocal: true,
  },
  remote: {
    host: 'hotpi.tsl',
    username: 'pi',
    path: '/home/pi/toaster',
  },
  watch: {
    options: {
      ignore: ['CSpell/**', 'cspell.yaml'],
    },
  },
};

export const targets: Targets = {
  hotpi,
};
