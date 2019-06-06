import _ from 'lodash';
import LRU from 'lru-cache';
import { Account, Block, Transaction, Transactions } from './types';
import { TransactionStatus, TransferType } from './Enums';
import {
  IConfig,
  IRawTransaction,
  ISignedRawTransaction,
  ISubmittedTransaction,
  ITokenRemake,
  IVOut,
} from './Interfaces';
import { FetchError } from 'node-fetch';
import { Currency } from './Currency';
import { implement } from './Utils';
import { getCurrency, getCurrencyConfig } from './EnvironmentData';

/**
 * The gateway provides methods/interfaces for our service
 * to connect to blockchain network
 * The method will be implemented in derived classes
 * They can be done via RPC calls, RESTful APIs, ...
 */
export abstract class BaseGateway {
  public static getInstance(options?: any): BaseGateway {
    throw new Error(`Must be implemented in derived class.`);
  }

  protected _cacheBlock: LRU<string | number, Block>;

  protected _cacheTxByHash: LRU<string, Transaction>;

  // Gateways are singletons
  // So we hide the constructor from outsiders
  protected constructor() {
    // Initiate the caches
    this._cacheBlock = new LRU(this._getCacheOptions());
    this._cacheTxByHash = new LRU(this._getCacheOptions());
  }

  @implement
  public getNetwork(): string {
    if (!process.env.NETWORK) {
      throw new Error('Network type required');
    }
    return process.env.NETWORK;
  }

  public async getCurrencyInfo(address: string): Promise<ITokenRemake> {
    return null;
  }

  @implement
  public getConfig(): IConfig {
    return getCurrencyConfig(getCurrency());
  }

  /**
   * Default: 1
   */
  @implement
  public isFastGateway(): boolean {
    return false;
  }

  /**
   * Handle more at extended classes
   * @param address
   */
  @implement
  public normalizeAddress(address: string) {
    return address;
  }

  /**
   * Get one transaction object by tixd
   * Firstly looking for it from cache
   * If cache doesn't exist, then get it from blockchain network
   *
   * @param {String} txid: the transaction hash
   * @returns {Transaction}: the transaction details
   */
  @implement
  public async getOneTransaction(txid: string): Promise<Transaction> {
    let tx = this._cacheTxByHash.get(txid);
    if (!tx) {
      tx = await this._getOneTransaction(txid);
    }

    if (!tx) {
      return null;
    }

    const lastNetworkBlock = await this.getBlockCount();
    tx.confirmations = lastNetworkBlock - tx.block.number + 1;
    this._cacheTxByHash.set(txid, tx);
    return tx;
  }

  public getLimitRun(): any {
    return null;
  }

  /**
   * Returns transactions with given txids
   *
   * @param {Array} txids: the array of transaction hashes/ids
   * @returns {Array}: the array of detailed transactions
   */
  @implement
  public async getTransactionsByIds(txids: string[]): Promise<Transactions> {
    const result = new Transactions();
    if (!txids || !txids.length) {
      return result;
    }

    const getOneTx = async (txid: string) => {
      const tx = await this.getOneTransaction(txid);
      if (tx) {
        result.push(tx);
      }
    };
    const tasks = txids.map(async txid => {
      if (this.getLimitRun()) {
        return this.getLimitRun()(async () => {
          return await getOneTx(txid);
        });
      } else {
        return await getOneTx(txid);
      }
    });

    await Promise.all(tasks);
    return result;
  }

  /**
   * Get block by the number or hash
   * Firstly looking for it from cache
   * If cache doesn't exist, then get it from blockchain network
   *
   * @param {string|number} blockHash: the block hash (or block number in case the parameter is Number)
   * @returns {Block} block: the block detail
   */
  @implement
  public async getOneBlock(blockHash: string | number): Promise<Block> {
    const cachedBlock = this._cacheBlock.get(blockHash);
    if (cachedBlock) {
      return cachedBlock;
    }

    const block = await this._getOneBlock(blockHash);
    this._cacheBlock.set(blockHash, block);
    return block;
  }

  /**
   * ReturnblockblockHash: string | numberdition.
   *
   * @param {Number} fromBlockNumber: number of begin block in search range
   * @param {Number} toBlockNumber: number of end block in search range
   * @returns {Transactions}: an array of transactions
   */
  @implement
  public async getMultiBlocksTransactions(fromBlockNumber: number, toBlockNumber: number): Promise<Transactions> {
    if (fromBlockNumber > toBlockNumber) {
      throw new Error(`fromBlockNumber must be less than toBlockNumber`);
    }
    const count = toBlockNumber - fromBlockNumber + 1;
    const blockNumbers = Array.from(new Array(count), (val, index) => index + fromBlockNumber);
    const result = new Transactions();
    await Promise.all(
      blockNumbers.map(async blockNumber => {
        const txs = await this.getBlockTransactions(blockNumber);
        const transactions = _.compact(txs);
        result.push(...transactions);
      })
    );
    return result;
  }

  @implement
  public async seedFee(privateKey: string, fromAddress: string, toAddress: string, amount: string) {
    const signTx = await this._forwardTransaction(privateKey, fromAddress, toAddress, amount);
    return this.sendRawTransaction(signTx.signedRaw);
  }

  /**
   * Error handler
   * @param e
   * @param params
   */
  @implement
  public handleError(e: any, ...params: any[]): Error {
    if (e instanceof FetchError) {
      return new Error(
        `Api endpoints request error with param ${JSON.stringify({
          params,
          message: e.message,
        })}`
      );
    }

    // if error is rpc type
    // TODO: add error type for rpc call
    if (e.request !== undefined) {
      if (e.status === 500) {
        return new Error(
          `Couldn't get information because of node errors ${JSON.stringify(e.response)} or wrong params ${params}`
        );
      }
      if (e.status === 401 || e.status === undefined) {
        return new Error(`Couldn't get information because of rpc node problems "${e.message}"`);
      }
    }
    return e;
  }

  @implement
  public async checkRPCNode(currency: Currency): Promise<boolean> {
    return true;
  }

  /**
   * Create a new random account/address
   *
   * @returns {Account} the account object
   */
  public abstract createAccount(): Account;

  /**
   * With some currencies we cannot create account with a synchronous method
   * Then we use this async method instead
   * TBD: should we change behaviour to always using async method?
   */
  public async createAccountAsync(): Promise<Account> {
    return this.createAccount();
  }

  /**
   * Check a given address is valid
   *
   * @param address
   */
  public async isValidAddressAsync(address: string): Promise<boolean> {
    // Default just accept all value, need to be implemented on all derived classes
    return true;
  }

  /**
   * Returns all transactions in givent block.
   *
   * @param {string|number} blockHash: header hash or height of the block
   * @returns {Transactions}: an array of transactions
   */

  /**
   * getBlockTransactions from network
   * @param blockHash
   */
  @implement
  public async getBlockTransactions(blockNumber: string | number): Promise<Transactions> {
    const block = await this.getOneBlock(blockNumber);
    const txs = await this.getTransactionsByIds(_.compact(block.txids));
    return txs;
  }

  /**
   * Default account base type
   */
  public getTransferType(): TransferType {
    return TransferType.ACCOUNT_BASED;
  }

  /**
   * No param
   * Returns the number of blocks in the local best block chain.
   * @returns {number}: the height of latest block on the block chain
   */
  public abstract async getBlockCount(): Promise<number>;

  /**
   * Validate a transaction and broadcast it to the blockchain network
   *
   * @param {String} rawTx: the hex-encoded transaction data
   * @returns {String}: the transaction hash in hex
   */
  public abstract async sendRawTransaction(rawTx: string): Promise<ISubmittedTransaction>;

  /**
   * Get balance of an address
   *
   * @param {String} address: address that want to query balance
   * @returns {string}: the current balance of address
   */
  public abstract async getAddressBalance(address: string): Promise<string>;

  /**
   * Create a raw transaction that tranfers currencies
   * from an address (in most cast it's a hot wallet address)
   * to one or multiple addresses
   * This method is async because we need to check state of sender address
   * Errors can be throw if the sender's balance is not sufficient
   *
   * @param {string} fromAddress
   * @param {IVout[]} vouts
   *
   * @returns {IRawTransaction}
   */
  public abstract async createRawTransaction(
    fromAddress: string[] | string,
    vouts: IVOut[] | IVOut,
    basedTxIds?: string[]
  ): Promise<IRawTransaction>;

  /**
   * Sign a raw transaction with single private key
   * Most likely is used to sign transaction sent from normal hot wallet
   *
   * @param {string} unsignedRaw is result of "createRawTransaction" method
   * @param {string} privateKey private key to sign, in string format
   *
   * @returns the signed transaction
   */
  public abstract signRawTxBySinglePrivateKey(
    unsignedRaw: string,
    privateKey: string | string[]
  ): Promise<ISignedRawTransaction>;

  /**
   * No param
   * Returns the avg fee to transfer a basic transaction.
   * @returns {string}: amount
   */
  public abstract getAvgFee(): string;

  public abstract async forwardTransaction(
    privateKey: string | string[],
    fromAddress: string | string[],
    toAddress: string,
    amount: string,
    basedTxIds?: string[]
  ): Promise<ISignedRawTransaction>;

  /**
   * Check whether a transaction is finalized on blockchain network
   *
   * @param {string} txid: the hash/id of transaction need to be checked
   * @returns {string}: the tx status
   */
  public abstract async getTransactionStatus(txid: string): Promise<TransactionStatus>;

  /**
   * Get cache options. Override this in derived class if needed
   *
   * @returns {LRU.Options} options for cache storage
   */
  @implement
  protected _getCacheOptions() {
    return {
      max: 1024 * 1024,
      maxAge: 1000 * 60 * 60, // 1 hour
    };
  }

  @implement
  protected async _forwardTransaction(
    privateKey: string | string[],
    fromAddress: string | string[],
    toAddress: string,
    amount: string,
    basedTxIds?: string[]
  ): Promise<ISignedRawTransaction> {
    const vouts = [{ toAddress, amount }];
    const rawTx = await this.createRawTransaction(fromAddress, vouts, basedTxIds);
    const signedTx = await this.signRawTxBySinglePrivateKey(rawTx.unsignedRaw, privateKey);
    return signedTx;
  }

  /**
   * Get block detailstxidstxids: string[]*
   * @param {string|number} blockHash: the block hash (or block number in case the parameter is Number)
   * @returns {Block} block: the block detail
   */
  protected abstract async _getOneBlock(blockHash: string | number): Promise<Block>;

  /**
   * Get one transaction object from blockchain network
   *
   * @param {String} txid: the transaction hash
   * @returns {Transaction}: the transaction details
   */
  protected abstract async _getOneTransaction(txid: string): Promise<Transaction>;
}

export default BaseGateway;
