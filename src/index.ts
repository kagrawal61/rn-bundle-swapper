export interface AndroidSwapOptions {
  apkPath: string;
  jsBundlePath: string;
  keystorePath: string;
  keystorePassword: string;
  keyAlias: string;
  keyPassword?: string;
  outputPath: string;
  copyAssets?: boolean;
}

export interface IosAppSwapOptions {
  appPath: string;
  jsBundlePath: string;
  outputPath: string;
  copyAssets?: boolean;
}

export interface IosIpaSwapOptions {
  ipaPath: string;
  jsBundlePath: string;
  identity: string;
  outputPath: string;
  ci?: boolean;
  copyAssets?: boolean;
}

export { swapAndroid } from './android/swap.js';
export { swapIosApp } from './ios/appSwap.js';
export { swapIosIpa } from './ios/ipaSwap.js';
export { buildBundle } from './utils/bundle.js';
export type { BuildBundleOptions, BuildBundleResult } from './utils/bundle.js';
