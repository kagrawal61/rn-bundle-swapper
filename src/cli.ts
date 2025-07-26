import { Command } from 'commander';
import { swapAndroid, swapIosApp, swapIosIpa } from './index';
import fs from 'fs-extra';
import chalk from 'chalk';
import { showBanner, BannerStyle } from './utils/logger';

const envStyleRaw = process.env.RNBS_BANNER_STYLE as BannerStyle | undefined;
const allowedStyles: BannerStyle[] = ['modern', 'ascii', 'compact'];
const bannerStyle: BannerStyle = allowedStyles.includes(envStyleRaw as BannerStyle)
  ? (envStyleRaw as BannerStyle)
  : 'modern';
// Show banner
showBanner('rn-bundle-swapper', '0.1.0', bannerStyle);

const program = new Command();
program
  .name('rn-bundle-swapper')
  .description(
    'Swap or update the JavaScript bundle inside an already–built React Native APK, .app, or .ipa file.'
  )
  .version('0.1.0')
  // auto-generated "help" sub-command (e.g. `rn-bundle-swapper help android`)
  .addHelpCommand('help [command]', 'Display help for a specific command')
  // after a parsing error, remind user of help flag
  .showHelpAfterError('(add --help for usage information)');

function required(filePath: string, description: string): string {
  if (!filePath) {
    console.error(chalk.red(`ERROR: ${description} is required.`));
    process.exit(1);
  }
  return filePath;
}

program
  .command('android <apkPath>')
  .description('Swap bundle in an APK and re-sign it')
  .requiredOption('--jsbundle <path>', 'Path to JS bundle')
  .requiredOption('--keystore <path>', 'Path to keystore')
  .requiredOption('--ks-pass <password>', 'Keystore password')
  .requiredOption('--ks-alias <alias>', 'Keystore alias')
  .option('--key-pass <password>', 'Key password')
  .option('-o, --output <path>', 'Output APK path', 'patched.apk')
  .option('--copy-assets', 'Copy Metro assets', false)
  .addHelpText('after', `\nExample:\n  $ rn-bundle-swapper android app-release-unsigned.apk \\\n    --jsbundle index.android.bundle \\\n    --keystore my.keystore --ks-pass android --ks-alias myalias \\\n    --output patched.apk\n`)
  .action(async (apkPath, options) => {
    try {
      await swapAndroid({
        apkPath,
        jsBundlePath: required(options.jsbundle, 'JS bundle path'),
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
    }
  });

program
  .command('ios-app <appPath>')
  .description('Swap bundle in an iOS .app (Simulator)')
  .requiredOption('--jsbundle <path>', 'Path to JS bundle')
  .option('-o, --output <path>', 'Output .app path', 'Patched.app')
  .option('--copy-assets', 'Copy Metro assets', false)
  .addHelpText('after', `\nExample:\n  $ rn-bundle-swapper ios-app MyApp.app \\\n    --jsbundle main.jsbundle \\\n    --output Patched.app\n`)
  .action(async (appPath, options) => {
    try {
      await swapIosApp({
        appPath,
        jsBundlePath: required(options.jsbundle, 'JS bundle path'),
        outputPath: options.output,
        copyAssets: options.copyAssets,
      });
      console.log(chalk.green(`✔ .app written to ${options.output}`));
    } catch (e) {
      console.error(chalk.red((e as Error).message));
      process.exit(1);
    }
  });

program
  .command('ios-ipa <ipaPath>')
  .description('Swap bundle in an iOS .ipa (Device) and re-sign')
  .requiredOption('--jsbundle <path>', 'Path to JS bundle')
  .requiredOption('--identity <identity>', 'Codesign identity')
  .option('-o, --output <path>', 'Output .ipa path', 'Patched.ipa')
  .option('--ci', 'Fail if identity not found; non-interactive', false)
  .option('--copy-assets', 'Copy Metro assets', false)
  .addHelpText('after', `\nExample (CI mode):\n  $ rn-bundle-swapper ios-ipa MyApp.ipa \\\n    --jsbundle main.jsbundle \\\n    --identity "Apple Distribution: Example Corp (TEAMID)" \\\n    --output Patched.ipa \\\n    --ci\n`)
  .action(async (ipaPath, options) => {
    try {
      await swapIosIpa({
        ipaPath,
        jsBundlePath: required(options.jsbundle, 'JS bundle path'),
        identity: options.identity,
        outputPath: options.output,
        ci: options.ci,
        copyAssets: options.copyAssets,
      });
      console.log(chalk.green(`✔ .ipa written to ${options.output}`));
    } catch (e) {
      console.error(chalk.red((e as Error).message));
      process.exit(1);
    }
  });

// Support JSON config file as --config <file.json>
program.option('--config <path>', 'Path to JSON config file with arguments');

// Because top-level await isn't available in CommonJS output, wrap the
// config-file preprocessing in an async IIFE.
(async () => {
  const argv = process.argv;
  const configIndex = argv.indexOf('--config');
  if (configIndex !== -1 && argv.length > configIndex + 1) {
    const configPath = argv[configIndex + 1];
    if (fs.existsSync(configPath)) {
      try {
        const configContent = await fs.readJson(configPath);
        // Insert config args after node + script path
        const newArgs = [...argv.slice(0, 2)];
        Object.entries(configContent).forEach(([key, value]) => {
          newArgs.push(`--${key}`);
          if (typeof value !== 'boolean') {
            newArgs.push(String(value));
          }
        });
        // Append remaining args (after --config <path>)
        newArgs.push(...argv.slice(configIndex + 2));
        program.parse(newArgs);
      } catch (err) {
        console.error(chalk.red(`Failed to read config at ${configPath}: ${(err as Error).message}`));
        process.exit(1);
      }
    } else {
      console.error(chalk.red(`Config file not found at ${configPath}`));
      process.exit(1);
    }
  } else {
    program.parse(argv);
  }
})();