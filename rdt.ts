import { Target, logger, BuildAndDeploy, Targets } from '@cinderblock/rdt';
import { transform, TransformOptions } from 'esbuild';
import { readFile } from 'fs/promises';

function posixPath(path: string) {
  return path.replace(/\\/g, '/');
}

const handler: BuildAndDeploy = {
  async onConnected({ rdt }) {
    const { targetName, targetConfig, connection } = rdt;
    logger.info(`connected to: ${targetName} [${targetConfig.remote?.host}]`);

    // Setup dependencies on remote that are required to run the app
    await rdt.apt.update();
    await rdt.apt.install(['git']);

    await rdt.node.install();

    await rdt.systemd.service.setup(
      'toaster',
      {
        Unit: {
          Description: 'Toaster Daemon',
        },
        Service: {
          ExecStart: '/usr/bin/node /home/pi/toaster',
        },
        Install: {
          WantedBy: 'multi-user.target',
        },
      },
      {
        userService: false,
      },
    );

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

    if (localPathSanitized.match(/\.tsx?$/)) {
      const remotePath = 'rdt/' + localPathSanitized.replace(/\.tsx?$/, '.js');

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
      return { changedFiles: [remotePath] };
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

    if (changedFiles.includes('package.json')) tasks.push(connection.exec('npm install'));

    await Promise.all(tasks);

    // TODO: Restart app
  },
};

logger.info('HELLO! 🟢🟢🟢🟢');

export const defaultTarget = 'hdpi';

const hdpi: Target = {
  handler,
  devServer: 'src/ui/index.ts',
  remote: {
    host: 'hdpi.tsl',
    username: 'pi',
  },
  watch: {
    options: {
      ignore: ['CSpell/**', 'cspell.yaml'],
    },
  },
};

export const targets: Targets = {
  hdpi,
};
