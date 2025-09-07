export interface AndroidSwapOptions {
  apkPath: string;
  jsBundlePath: string;
  keystorePath: string;
  keystorePassword: string;
  keyAlias: string;
  keyPassword?: string;
  outputPath: string;
}

export interface IosAppSwapOptions {
  appPath: string;
  jsBundlePath: string;
  outputPath: string;
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