import Currency from '../Currency';
import Transaction from './Transaction';

interface ITransferOutputProps {
  readonly currency: Currency;
  readonly subCurrency: string;
  readonly txid: string;
  readonly toAddress: string;
  readonly amount: string;
  tx: Transaction;
}

export class TransferOutput implements ITransferOutputProps {
  public readonly currency: Currency;
  public readonly subCurrency: string;
  public readonly txid: string;
  public readonly toAddress: string;
  public readonly amount: string;
  public readonly tx: Transaction;

  constructor(props: ITransferOutputProps) {
    Object.assign(this, props);
  }
}

export default TransferOutput;
