import Currency from './Currency';

/**
 * With usdt, network symbol value is equal to property id
 */
export interface ITokenRemake {
  readonly family: Currency;
  readonly symbol: string;
  readonly networkSymbol: string;
  readonly minimumDeposit: string;
  readonly type: string;
  readonly name: string;
  readonly decimal: number;
  readonly precision: number;
  readonly contractAddress: string;
  readonly subversionName: string;
  readonly network: string;
  readonly hasMemo: number;
}

export interface IConfig {
  readonly currency: string;
  readonly network: string;
  readonly chainId: string;
  readonly chainName: string;
  readonly averageBlockTime: number;
  readonly apiEndpoint: string;
  readonly explorerEndpoint: string;
  readonly internalApiEndpoint: string;
  readonly rpc: string;
  readonly requiredConfirmations: number;
  readonly feeUnit: number;
  readonly startCrawlBlock: number;
}

export interface ITokenContract {
  contract: any;
  contractAddress: string;
  token: ITokenRemake;
}

export interface IRawTransaction {
  txid: string;
  unsignedRaw: string;
}

export interface ISignedRawTransaction extends IRawTransaction {
  signedRaw: string;
}

export interface IVOut {
  toAddress: string;
  amount: string;
}

export interface IVIn {
  fromAddress: string;
  amount: string;
}

export interface ISubmittedTransaction {
  readonly txid: string;
  readonly blockNumber?: number;
}

export interface IEnvConfig {
  key: string;
  value: string;
}
