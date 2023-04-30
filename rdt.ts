import { Target, logger, BuildAndDeploy, Targets } from '@cinderblock/rdt';
import { transform, TransformOptions } from 'esbuild';
import { readFile } from 'fs/promises';
import { Client } from 'ssh2';
import { SFTP } from 'ssh2/lib/protocol/SFTP';

function posixPath(path: string) {
  return path.replace(/\\/g, '/');
}

const remoteDir = 'toaster';

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

      await rdt.node.install();
      lock();
    } else {
      logger.info(`Skipping apt update/install since it was already done recently`);
    }

    await rdt.systemd.service.setup(
      'toaster',
      {
        Unit: {
          Description: 'Toaster Daemon',
        },
        Service: {
          // TODO: get `/usr/local/bin/node` from `which node`
          ExecStart: `/usr/local/bin/node /home/pi/${remoteDir}`,
        },
        Install: {
          WantedBy: 'multi-user.target',
        },
      },
      {
      },
    );

    rdt.systemd.journal.follow('toaster');

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

      await rdt.fs.ensureFileIs(outFile, JSON.stringify(pack, null, 2));
      return outFile;
    }

    if (localPathSanitized.match(/\.tsx?$/)) {
      const remotePath = remoteDir + '/' + localPathSanitized.replace(/\.tsx?$/, '.js');

      const opts: TransformOptions = {
        loader: 'ts',
        target: 'es2019',
        sourcemap: true,
      };

      if (localPathSanitized.startsWith('src/ui/')) {
        // TODO: Bundle?
        return;

        opts.loader = 'tsx';
        opts.target = 'esnext';
      }

      const { code } = await transform(await readFile(localPath), opts);

      await rdt.fs.ensureFileIs(remotePath, code);

      logger.info(`deployed: ${localPathSanitized} -> ${remotePath} bytes: ${code.length}`);

      return remotePath;
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
    await rdt.systemd.service.restart('toaster');
  },
};

export const defaultTarget = 'hotpi';

const hotpi: Target = {
  handler,
  devServer: 'src/ui/index.ts',
  remote: {
    host: 'hotpi.tsl',
    username: 'pi',
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
