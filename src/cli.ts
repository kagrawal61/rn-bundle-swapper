import { createRequire } from 'module';
import { Command } from 'commander';
import { swapAndroid, swapIosApp, swapIosIpa } from './index.js';
import { buildBundle } from './utils/bundle.js';
import { loadConfigFlags } from './utils/config.js';
import fs from 'fs-extra';
import chalk from 'chalk';
import { showBanner, BannerStyle } from './utils/logger.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

const envStyleRaw = process.env.RNBS_BANNER_STYLE as BannerStyle | undefined;
const allowedStyles: BannerStyle[] = ['modern', 'ascii', 'compact'];
const bannerStyle: BannerStyle = allowedStyles.includes(envStyleRaw as BannerStyle)
  ? (envStyleRaw as BannerStyle)
  : 'modern';

showBanner('rn-bundle-swapper', version, bannerStyle);

const program = new Command();
program
  .name('rn-bundle-swapper')
  .description(
    'Swap or update the JavaScript bundle inside an already–built React Native APK, .app, or .ipa file.'
  )
  .version(version)
  .addHelpCommand('help [command]', 'Display help for a specific command')
  .showHelpAfterError('(add --help for usage information)');

function cliError(message: string, hints: string[]): never {
  console.error('');
  console.error(chalk.red.bold(`  ✘ ${message}`));
  if (hints.length > 0) {
    console.error('');
    for (const hint of hints) {
      console.error(chalk.gray(`    ${hint}`));
    }
  }
  console.error('');
  process.exit(1);
}

function requireBundlePath(options: Record<string, string>): string {
  if (!options.jsbundle) {
    cliError('Missing JS bundle path', [
      'Provide a pre-built bundle:  --jsbundle <path>',
      'Or build one automatically:  --build-jsbundle --project-root ./MyApp',
      '',
      'Hint: After running Metro, the bundle is usually at:',
      '  Android → android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle',
      '  iOS     → ios/build/Build/Products/Release-iphonesimulator/main.jsbundle',
    ]);
  }
  return options.jsbundle;
}

const MISSING_ARG_HINTS: Record<string, { message: string; hints: string[] }> = {
  apkPath: {
    message: 'Missing APK path',
    hints: [
      'Usage:  rn-bundle-swapper android <apkPath> [options]',
      '',
      'Common APK locations:',
      '  Debug   → android/app/build/outputs/apk/debug/app-debug.apk',
      '  Release → android/app/build/outputs/apk/release/app-release.apk',
    ],
  },
  appPath: {
    message: 'Missing .app path',
    hints: [
      'Usage:  rn-bundle-swapper ios-app <appPath> [options]',
      '',
      'Common .app locations (Simulator builds):',
      '  Debug   → ios/build/Build/Products/Debug-iphonesimulator/YourApp.app',
      '  Release → ios/build/Build/Products/Release-iphonesimulator/YourApp.app',
    ],
  },
  ipaPath: {
    message: 'Missing .ipa path',
    hints: [
      'Usage:  rn-bundle-swapper ios-ipa <ipaPath> [options]',
      '',
      'Build an IPA via Xcode Archive or:',
      '  xcodebuild -exportArchive -archivePath YourApp.xcarchive \\',
      '    -exportOptionsPlist ExportOptions.plist -exportPath ./build',
    ],
  },
};

function setupMissingArgHint(cmd: Command): void {
  cmd.configureOutput({
    outputError: () => { /* suppress Commander's default error/help-after-error — we show our own */ },
    writeErr: () => { /* suppress showHelpAfterError text */ },
  });
  cmd.exitOverride((err) => {
    const msg = err.message;
    for (const [arg, info] of Object.entries(MISSING_ARG_HINTS)) {
      if (msg.includes(`missing required argument '${arg}'`)) {
        cliError(info.message, info.hints);
      }
    }
    // Re-throw for non-matching errors (e.g. --help, --version)
    throw err;
  });
}

const androidCmd = program
  .command('android <apkPath>')
  .description('Swap bundle in an APK and re-sign it');
setupMissingArgHint(androidCmd);
androidCmd
  .option('--jsbundle <path>', 'Path to pre-built JS bundle')
  .option('--build-jsbundle', 'Build JS bundle from project before swapping', false)
  .option('--project-root <path>', 'React Native project root (default: cwd)')
  .option('--no-hermes', 'Skip Hermes bytecode compilation when building bundle')
  .option('--keystore <path>', 'Path to keystore')
  .option('--ks-pass <password>', 'Keystore password')
  .option('--ks-alias <alias>', 'Keystore alias')
  .option('--key-pass <password>', 'Key password')
  .option('--no-copy-assets', 'Skip copying Metro assets alongside the bundle')
  .option('-o, --output <path>', 'Output APK path', 'patched.apk')
  .addHelpText('after', `
Examples:
  # Use a pre-built bundle
  $ rn-bundle-swapper android app.apk \\
      --jsbundle index.android.bundle \\
      --keystore my.keystore --ks-pass android --ks-alias myalias

  # Build bundle from project, then swap (Hermes enabled by default)
  $ rn-bundle-swapper android app.apk \\
      --build-jsbundle --project-root ./MyApp \\
      --keystore my.keystore --ks-pass android --ks-alias myalias

  # Build without Hermes
  $ rn-bundle-swapper android app.apk \\
      --build-jsbundle --no-hermes --project-root ./MyApp \\
      --keystore my.keystore --ks-pass android --ks-alias myalias
`)
  .action(async (apkPath, options) => {
    const missingOpts: { key: string; flag: string; hints: string[] }[] = [
      {
        key: 'keystore',
        flag: '--keystore',
        hints: [
          'The debug keystore is usually at:  ~/.android/debug.keystore',
          'For release builds, use the keystore you signed the original APK with.',
          'List keys:  keytool -list -keystore <path>',
        ],
      },
      {
        key: 'ksPass',
        flag: '--ks-pass',
        hints: [
          'The default debug keystore password is:  android',
          'For release, use the password you set when creating the keystore.',
        ],
      },
      {
        key: 'ksAlias',
        flag: '--ks-alias',
        hints: [
          'The default debug key alias is:  androiddebugkey',
          'List aliases:  keytool -list -keystore <your.keystore>',
        ],
      },
    ];
    const missing = missingOpts.filter((o) => !options[o.key]);
    if (missing.length > 0) {
      const flags = missing.map((o) => o.flag).join(', ');
      const hints = missing.flatMap((o) => [`${chalk.yellow(o.flag)}`, ...o.hints, '']);
      cliError(`Missing required option(s): ${flags}`, hints);
    }

    let jsBundlePath: string;
    let buildOutDir: string | undefined;

    if (options.buildJsbundle) {
      const projectRoot = options.projectRoot ?? process.cwd();
      const result = await buildBundle({
        projectRoot,
        platform: 'android',
        hermes: options.hermes !== false,
      });
      jsBundlePath = result.bundlePath;
      buildOutDir = result.outDir;
      // Assets are in a known location — enable copy automatically
      options.copyAssets = true;
    } else {
      jsBundlePath = requireBundlePath(options);
    }

    try {
      await swapAndroid({
        apkPath,
        jsBundlePath,
        keystorePath: options.keystore,
        keystorePassword: options.ksPass,
        keyAlias: options.ksAlias,
        keyPassword: options.keyPass,
        outputPath: options.output,
        copyAssets: options.copyAssets,
      });
      console.log(chalk.green(`✔ APK written to ${options.output}`));
    } catch (e) {
      console.error(chalk.red((e as Error).message));
      process.exit(1);
    } finally {
      if (buildOutDir) await fs.remove(buildOutDir);
    }
  });

const iosAppCmd = program
  .command('ios-app <appPath>')
  .description('Swap bundle in an iOS .app (Simulator)');
setupMissingArgHint(iosAppCmd);
iosAppCmd
  .option('--jsbundle <path>', 'Path to pre-built JS bundle')
  .option('--build-jsbundle', 'Build JS bundle from project before swapping', false)
  .option('--project-root <path>', 'React Native project root (default: cwd)')
  .option('--no-hermes', 'Skip Hermes bytecode compilation when building bundle')
  .option('--no-copy-assets', 'Skip copying Metro assets alongside the bundle')
  .option('-o, --output <path>', 'Output .app path', 'Patched.app')
  .addHelpText('after', `
Examples:
  # Use a pre-built bundle
  $ rn-bundle-swapper ios-app MyApp.app --jsbundle main.jsbundle

  # Build bundle from project, then swap
  $ rn-bundle-swapper ios-app MyApp.app \\
      --build-jsbundle --project-root ./MyApp
`)
  .action(async (appPath, options) => {
    let jsBundlePath: string;
    let buildOutDir: string | undefined;

    if (options.buildJsbundle) {
      const projectRoot = options.projectRoot ?? process.cwd();
      const result = await buildBundle({
        projectRoot,
        platform: 'ios',
        hermes: options.hermes !== false,
      });
      jsBundlePath = result.bundlePath;
      buildOutDir = result.outDir;
      options.copyAssets = true;
    } else {
      jsBundlePath = requireBundlePath(options);
    }

    try {
      await swapIosApp({
        appPath,
        jsBundlePath,
        outputPath: options.output,
        copyAssets: options.copyAssets,
      });
      console.log(chalk.green(`✔ .app written to ${options.output}`));
    } catch (e) {
      console.error(chalk.red((e as Error).message));
      process.exit(1);
    } finally {
      if (buildOutDir) await fs.remove(buildOutDir);
    }
  });

const iosIpaCmd = program
  .command('ios-ipa <ipaPath>')
  .description('Swap bundle in an iOS .ipa (Device) and re-sign');
setupMissingArgHint(iosIpaCmd);
iosIpaCmd
  .option('--jsbundle <path>', 'Path to pre-built JS bundle')
  .option('--build-jsbundle', 'Build JS bundle from project before swapping', false)
  .option('--project-root <path>', 'React Native project root (default: cwd)')
  .option('--no-hermes', 'Skip Hermes bytecode compilation when building bundle')
  .option('--identity <identity>', 'Codesign identity')
  .option('--no-copy-assets', 'Skip copying Metro assets alongside the bundle')
  .option('-o, --output <path>', 'Output .ipa path', 'Patched.ipa')
  .option('--ci', 'Fail if identity not found; non-interactive', false)
  .addHelpText('after', `
Examples:
  # Use a pre-built bundle
  $ rn-bundle-swapper ios-ipa MyApp.ipa \\
      --jsbundle main.jsbundle \\
      --identity "Apple Distribution: Example Corp (TEAMID)"

  # Build bundle from project, then swap (CI mode)
  $ rn-bundle-swapper ios-ipa MyApp.ipa \\
      --build-jsbundle --project-root ./MyApp \\
      --identity "Apple Distribution: Example Corp (TEAMID)" \\
      --ci
`)
  .action(async (ipaPath, options) => {
    if (!options.identity) {
      cliError('Missing required option: --identity', [
        'Provide the codesign identity used to sign the original IPA.',
        '',
        'List available identities:',
        '  security find-identity -v -p codesigning',
        '',
        'Example:',
        '  --identity "Apple Distribution: Your Company (TEAMID)"',
      ]);
    }

    let jsBundlePath: string;
    let buildOutDir: string | undefined;

    if (options.buildJsbundle) {
      const projectRoot = options.projectRoot ?? process.cwd();
      const result = await buildBundle({
        projectRoot,
        platform: 'ios',
        hermes: options.hermes !== false,
      });
      jsBundlePath = result.bundlePath;
      buildOutDir = result.outDir;
      options.copyAssets = true;
    } else {
      jsBundlePath = requireBundlePath(options);
    }

    try {
      await swapIosIpa({
        ipaPath,
        jsBundlePath,
        identity: options.identity,
        outputPath: options.output,
        ci: options.ci,
        copyAssets: options.copyAssets,
      });
      console.log(chalk.green(`✔ .ipa written to ${options.output}`));
    } catch (e) {
      console.error(chalk.red((e as Error).message));
      process.exit(1);
    } finally {
      if (buildOutDir) await fs.remove(buildOutDir);
    }
  });

// Support JSON config file as --config <file.json>
program.option('--config <path>', 'Path to JSON config file with arguments');

// Config file preprocessing: inject JSON keys as CLI flags before Commander parses.
(async () => {
  const argv = process.argv;
  const configIndex = argv.indexOf('--config');
  if (configIndex !== -1 && argv.length > configIndex + 1) {
    const configPath = argv[configIndex + 1];
    try {
      const flags = await loadConfigFlags(configPath);
      const newArgs = [...argv.slice(0, 2), ...flags, ...argv.slice(configIndex + 2)];
      try {
        program.parse(newArgs);
      } catch {
        process.exit(0);
      }
    } catch (err) {
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }
  } else {
    try {
      program.parse(argv);
    } catch {
      // exitOverride throws for --help/--version; those are already handled
      process.exit(0);
    }
  }
})();
