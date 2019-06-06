import URL from 'url';
import Currency from './Currency';
import { IConfig, ITokenRemake, IEnvConfig } from './Interfaces';
import { Const } from './Const';
import { getLogger } from './Logger';
import { BaseGateway, Utils } from '../index';
import fetch from 'node-fetch';
import { TokenType } from './Enums';
/**
 * Environment data is usually loaded from database at runtime
 * These are some pre-defined types of data
 * Is there any case we need to defined it as generic?
 */

const allTokens = new Map<string, ITokenRemake>();
const allTokensBySymbol = new Map<string, ITokenRemake>();
const allTokenByContract = new Map<string, ITokenRemake>();
const config = new Map<Currency, IConfig>();
const envConfig = new Map<string, string>();

// Inside this process
let tokenSymbols: string[] = [];
let tokenSymbolsBuilder: string;
let tokenType: string;
let tokenFamily: string;
let currency: Currency;
let uniqueApiEndpoint: string;

// gateway module
let currencyGateway: BaseGateway;
let currencyTokenGateway: BaseGateway;

export function listTokenByType(type: TokenType): Map<string, ITokenRemake> {
  const res = new Map<string, ITokenRemake>();
  allTokens.forEach((token, key) => {
    if (type === token.type) {
      res.set(key, token);
    }
  });
  return res;
}

export function getTokenFamilyOfType(type: string): string {
  let ret: string = null;
  allTokens.forEach(token => {
    if (type === token.type) {
      ret = token.family;
      return;
    }
  });
  return ret;
}

export function getTokenBySymbol(symbol: string): ITokenRemake {
  if (!symbol) {
    return null;
  }
  const token = allTokensBySymbol.get(`${symbol}`);
  if (!token) {
    throw new Error(`Cannot find ${symbol.toUpperCase()} configuration. Will exit process`);
  }
  return token;
}

function getTheTokenByContract(address: string, type: TokenType): ITokenRemake {
  const listTokens = listTokenByType(type);
  let res: ITokenRemake = null;
  listTokens.forEach(token => {
    if (token.contractAddress.toLowerCase() === address.toLowerCase()) {
      res = token;
    }
  });
  return res;
}

export async function setTokenData(tokens: ITokenRemake[]) {
  tokens.forEach(token => {
    allTokens.set(`${token.symbol}_${token.type}`, token);
    allTokensBySymbol.set(`${token.symbol}`, token);
    if (token.contractAddress) {
      allTokenByContract.set(token.contractAddress.toLowerCase(), token);
    }
  });
}

export function getTokenByContract(type: TokenType, address: string): ITokenRemake {
  return getTheTokenByContract(address, type);
}

export function setBlockchainNetworkEnv(): void {
  const token = getTokenBySymbol(getFamily());
  if (!token) {
    console.log(`${getFamily().toUpperCase()} config is missing from currency table`);
  }
  process.env.NETWORK = token.network;
}

export function getCurrencyConfig(c: Currency): IConfig {
  return config.get(c);
}

export function setCurrencyConfig(c: Currency, configData: IConfig) {
  config.set(c, configData);
}

export async function updateValidApiEndpoint(): Promise<string> {
  if (!getCurrencyConfig(getCurrency()).apiEndpoint) {
    return null;
  }
  const apiEnpoints = getCurrencyConfig(getCurrency()).apiEndpoint.split(',');
  const validApiEndpoints: string[] = [];
  await Promise.all(
    apiEnpoints.map(async apiEndpoint => {
      try {
        const start = Utils.nowInMillis();
        if (!apiEndpoint) {
          return;
        }
        const fullEndpoint = new URL.URL(apiEndpoint);
        if (fullEndpoint.protocol !== 'http:' && fullEndpoint.protocol !== 'https:') {
          fullEndpoint.protocol = 'https:';
        }
        await fetch(`${fullEndpoint}`);
        const end = Utils.nowInMillis();
        const ping = end - start;
        if (ping > 5000) {
          return;
        }
      } catch (e) {
        return;
      }
      validApiEndpoints.push(apiEndpoint);
    })
  );

  uniqueApiEndpoint = validApiEndpoints.length > 0 ? validApiEndpoints[0] : null;
  if (validApiEndpoints.length > 0) {
    uniqueApiEndpoint = validApiEndpoints[0];
  } else {
    throw new Error(
      `Cannot reach to any ${getCurrency().toUpperCase()} api endpoints: ${
        getCurrencyConfig(getCurrency()).apiEndpoint
      }. Re-configure api link in config database`
    );
  }
  return validApiEndpoints.length > 0 ? validApiEndpoints[0] : null;
}

export function getApiEndpoint(): string {
  return uniqueApiEndpoint;
}

// after prepare
export function getType(): string {
  return tokenType;
}

// after prepare
export function getFamily(): string {
  return tokenFamily;
}

/**
 * Build to object
 * {
 *   tokenSymbolsBuilder: "token1, token2",
 *   tokenSymbols: [ 'token1', 'token2' ]
 * }
 * @param c
 * @param type
 */
export function buildListTokenSymbols(c: Currency, type?: TokenType): any {
  const envTokenSymbols = process.env.TOKENS;
  currency = c;

  // if type is not defined, build tokenType and tokenFamily from default currency
  if (!type) {
    const token = getTokenBySymbol(c);
    if (!token) {
      throw new Error(`Cannot build token data due to cannot find ${c} currency configuration`);
    }
    tokenType = getTokenBySymbol(c).type.toString();
    tokenFamily = getTokenBySymbol(c).family.toString();
    // default: currency not family
    tokenSymbolsBuilder = c.toString();
    tokenSymbols.push(c.toString());
    return {
      tokenSymbolsBuilder,
      tokenSymbols,
    };
  }

  tokenType = type;
  tokenFamily = getTokenFamilyOfType(tokenType);

  if (envTokenSymbols) {
    tokenSymbolsBuilder = envTokenSymbols;
    tokenSymbols = tokenArray(tokenSymbolsBuilder);
  } else {
    getLogger('Environment').warn(
      `Cannot find any token configuration in .env file. Missing TOKENS env. Will get all ${tokenType.toUpperCase()} tokens in currency table`
    );
    const storedTokens = listTokenByType(type);
    if (!storedTokens.size) {
      getLogger('Environment').warn(`Cannot find any ${type} token configuration in database`);
      process.exit(1);
    }
    storedTokens.forEach(value => {
      tokenSymbols.push(value.symbol);
    });
    tokenSymbolsBuilder = tokenSymbols.join(',');
  }
  return {
    tokenSymbolsBuilder,
    tokenSymbols,
  };
}

export function getListTokenSymbols() {
  return {
    tokenSymbolsBuilder,
    tokenSymbols,
  };
}

/**
 * Split "token1, token2" to array [ 'token1', 'token2' ]
 * @param tokensBuilder
 */
export function tokenArray(tokensBuilder: string): string[] {
  return tokensBuilder.trim().split(Const.TOKEN_SEPARATOR);
}

export function getAppId(): string {
  return 'PP70ExC8Hr';
}

export function getMinimumDepositAmount(c: string): string {
  return getTokenBySymbol(c).minimumDeposit;
}

export function getCurrencyDecimal(c: string): number {
  return getTokenBySymbol(c).decimal;
}

export function getCurrency(): Currency {
  return currency;
}

export function getEnvConfig(key: string): string {
  return envConfig.get(key);
}

export function setEnvConfig(configs: IEnvConfig[]) {
  configs.map(cf => {
    envConfig.set(cf.key, cf.value);
  });
}

const gatewaysMap = new Map<string, BaseGateway>();

/**
 * If contract address of a currency is existed, will return a token gateway
 * else return gateway of its family
 * @param currcy
 */
export function getGateway(currcy?: string) {
  const contractAddress = getTokenBySymbol(currcy) ? getTokenBySymbol(currcy).contractAddress : null;
  if (contractAddress) {
    const gw = gatewaysMap.get(contractAddress);
    if (gw) {
      return gw;
    }

    const newGateway = new (getTokenGateway() as any)(contractAddress);
    gatewaysMap.set(contractAddress, newGateway);
    return newGateway;
  } else {
    const gw = gatewaysMap.get(getFamily());
    if (gw) {
      return gw;
    }

    const newGateway = new (getCurrencyGateway() as any)();
    gatewaysMap.set(getFamily(), newGateway);
    return newGateway;
  }
}

export async function setCurrencyGateway() {
  const getModule: any = async () => await import(`../../sota-${getFamily()}`);
  if (!getModule()) {
    console.log('Cannot find module sota-' + getFamily());
  }

  const module = await getModule();
  currencyGateway = module[`${upperFirst(getFamily())}Gateway`];
}

export async function setTokenGateway() {
  const getModule: any = async () => await import(`../../sota-${getFamily()}`);
  if (!getModule()) {
    console.log('Cannot find getModule sota-' + getFamily());
  }

  const module = await getModule();
  currencyTokenGateway = module[`${upperFirst(getType())}Gateway`];
}

export function upperFirst(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getCurrencyGateway() {
  return currencyGateway;
}

export function getTokenGateway() {
  return currencyTokenGateway;
}
