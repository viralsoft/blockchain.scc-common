// Get current timestamp in millisecond
import URL from 'url';
import BigNumber from 'bignumber.js';
import { getFamily, getTokenBySymbol } from './EnvironmentData';
import BaseGateway from './BaseGateway';

export function nowInMillis(): number {
  return Date.now();
}

// Alias for nowInMillis
export function now(): number {
  return nowInMillis();
}

export function nowInSeconds(): number {
  return (nowInMillis() / 1000) | 0;
}

export function isValidURL(urlString: string): boolean {
  try {
    const parsedUrl = new URL.URL(urlString);
  } catch (e) {
    return false;
  }

  return true;
}

export function reflect(promise: any) {
  return promise
    .then((data: any) => {
      return { data, status: 'resolved' };
    })
    .catch((error: any) => {
      return { error, status: 'rejected' };
    });
}

export async function timeout(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * promise all and handle error message
 * @param values
 * @constructor
 */
export async function PromiseAll(values: any[]): Promise<any[]> {
  let results: any[];
  await (async () => {
    return await Promise.all(values.map(reflect));
  })().then(async res => {
    const errors: any[] = [];
    results = res.map(r => {
      if (r.status === 'rejected') {
        errors.push(r.error);
      }
      return r.data;
    });
    if (errors.length !== 0) {
      // have lots of error, throw first error
      throw errors[0];
    }
  });
  return results;
}

/**
 * Remove " and \" characters
 * @param value
 * @private
 */
function _removeDoubleQuote(value: string) {
  return value.replace(/\\\"/g, '').replace(/\"/g, '');
}

/**
 * Precision is gotten from environment or config
 * @param amount
 * @param currency
 */
export function handleAmountPrecision(amount: string, currency: string): string {
  const res = new BigNumber(amount);
  let precision = 0;
  const token = getTokenBySymbol(currency);
  if (token) {
    precision = token.precision;
  } else {
    console.log(`Cannot find ${currency} currency at any configurations`);
  }
  return res.toFixed(precision);
}

/* Put this in a helper library somewhere */
export function override(container: any, key: any) {
  const baseType = Object.getPrototypeOf(container);
  if (typeof baseType[key] !== 'function') {
    const overrideError: string =
      'Method ' + key + ' of ' + container.constructor.name + ' does not override any base class method';
    throw new Error(overrideError);
  }
}

/* Put this in a helper library somewhere */
export function implement(container: any, key: any) {
  const baseType = Object.getPrototypeOf(container);
  if (typeof baseType[key] === 'function') {
    const overrideError: string = 'Method ' + key + ' of ' + container.constructor.name + ' implemented on base class';
    throw new Error(overrideError);
  }
}

/**
 * TODO: will update
 * one family one gateway
 * @param currency
 */
export function getGateway(gatewayClass: any): BaseGateway {
  // get interact contract with family
  const family = getFamily();
  return gatewayClass.getInstance(getTokenBySymbol(family) ? getTokenBySymbol(family).contractAddress : null);
}
