import chalk from 'chalk';
import logSymbols from 'log-symbols';
import ora, { Ora } from 'ora';
import boxen from 'boxen';
import gradient from 'gradient-string';
import figlet from 'figlet';

export const logger = {
  info: (msg: string) => console.log(`${logSymbols.info} ${chalk.cyan(msg)}`),
  success: (msg: string) => console.log(`${logSymbols.success} ${chalk.green(msg)}`),
  warn: (msg: string) => console.warn(`${logSymbols.warning} ${chalk.yellow(msg)}`),
  error: (msg: string) => console.error(`${logSymbols.error} ${chalk.red(msg)}`),
  spinner: (msg: string): Ora => ora({ text: msg, color: 'cyan' }).start(),
};

export type BannerStyle = 'compact' | 'ascii' | 'modern';

function renderCompactBanner(name: string, version: string): void {
  const msg = `${chalk.bold.cyan(name)}  ${chalk.gray(`v${version}`)}`;
  const description = chalk.white('Swap JS bundles in React Native apps');
  const boxed = boxen(`${msg}\n${description}`, {
    padding: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
    align: 'center',
    title: chalk.bold.magenta('React Native Bundle Swapper'),
    titleAlignment: 'center',
  });
  console.log(boxed);
}

export function showBanner(
  name: string,
  version: string,
  style: BannerStyle = 'modern',
) {
  if (process.env.CI === 'true' || !process.stdout.isTTY) {
    console.log(chalk.gray(`${name} v${version}`));
    return;
  }

  if (style === 'modern') {
    const columns = process.stdout.columns || 80;
    const ascii = figlet.textSync(name, {
      font: 'Big Money-nw',
      horizontalLayout: 'fitted',
      verticalLayout: 'default',
    });

    const longest = ascii.split('\n').reduce((m, l) => Math.max(m, l.length), 0);

    if (longest + 4 > columns) {
      // Terminal too narrow — fall back to compact
      renderCompactBanner(name, version);
      return;
    }

    const colored = gradient.pastel.multiline(ascii);
    const footer = chalk.gray.bold(`v${version}`);
    const description = chalk.white('React Native Bundle Hot-Swapper Tool');

    const boxed = boxen(`${colored}\n${description}\n${footer}`, {
      padding: 1,
      borderStyle: 'double',
      borderColor: 'cyan',
      backgroundColor: '#111',
      align: 'center',
      title: chalk.bold.magenta('React Native Bundle Swapper'),
      titleAlignment: 'center',
    });
    console.log(boxed);
    return;
  }

  // 'compact' or 'ascii' (ascii not yet distinct — renders as compact)
  renderCompactBanner(name, version);
}
