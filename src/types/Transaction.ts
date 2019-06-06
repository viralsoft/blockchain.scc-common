import BlockHeader from './BlockHeader';
import TransferOutput from './TransferOutput';

interface ITransactionProps {
  readonly txid: string;
  readonly height: number;
  readonly timestamp: number;
  confirmations: number;
}

export abstract class Transaction implements ITransactionProps {
  public readonly txid: string;
  public readonly height: number;
  public readonly timestamp: number;
  public readonly block: BlockHeader;
  // Its value is empty or a contract address
  public contractAddress: string;
  public confirmations: number;
  public isFailed: boolean;

  constructor(props: ITransactionProps, block: BlockHeader) {
    Object.assign(this, props);
    this.block = block;
    this.isFailed = false;
  }

  /**
   * Extract all every change  from a transaction
   *
   * @returns {TransferOutput[]} array of transfer outputs
   */
  public abstract extractEntries(): TransferOutput[];

  /**
   * Extract recipient addresses.
   *
   * @returns {string[]} array of addresses under string format
   */
  public extractRecipientAddresses(): string[] {
    // Recipients are addresses from transfer outputs
    // which have positive amount
    return this.extractTransferOutputs().map(t => t.toAddress);
  }

  public getExtraDepositData(): any {
    return {
      blockHash: this.block.hash,
      blockNumber: this.height,
      blockTimestamp: this.timestamp,
    };
  }

  // With entries that balance change avalue is negative,
  // that is balance changing of senders
  public extractSenderAddresses(): string[] {
    const res: TransferOutput[] = [];
    const entries: TransferOutput[] = this.extractEntries();
    entries.forEach(entry => {
      if (parseFloat(entry.amount) < 0) {
        res.push(entry);
      }
    });
    return res.map(t => t.toAddress);
  }

  /**
   * Extract all positive entries
   */
  public extractTransferOutputs(): TransferOutput[] {
    const res: TransferOutput[] = [];
    const entries: TransferOutput[] = this.extractEntries();
    entries.forEach(entry => {
      if (parseFloat(entry.amount) >= 0) {
        res.push(entry);
      }
    });
    return res;
  }

  /**
   * Merge all entries with unique addresses
   * @param outputs
   */
  public mergeOutput(outputs: TransferOutput[]): TransferOutput[] {
    const res: TransferOutput[] = [];
    outputs.map(output => {
      const item = res.find(i => i.toAddress === output.toAddress);
      const itemIndex = res.findIndex(i => i.toAddress === output.toAddress);
      if (!item) {
        res.push(output);
      } else {
        res.splice(itemIndex, 1);
        const newItem = {
          amount: (parseFloat(item.amount) + parseFloat(output.amount)).toString(),
          currency: output.currency,
          subCurrency: output.currency,
          toAddress: output.toAddress,
          tx: output.tx,
          txid: output.txid,
        };
        res.push(newItem);
      }
    });
    return res;
  }

  /**
   * Additional field for special field of some kind of transaction
   */
  public extractAdditionalField(): any {
    return {};
  }

  public abstract getNetworkFee(): string;
}

export default Transaction;
