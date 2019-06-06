import BaseWithdrawalWorker from './BaseWithdrawalWorker';
import BaseWithdrawalPicker from './BaseWithdrawalPicker';
import BaseWithdrawalSender from './BaseWithdrawalSender';
import BaseWithdrawalSigner from './BaseWithdrawalSigner';
import BaseWithdrawalVerifier from './BaseWithdrawalVerifier';
import Currency from './Currency';

export interface IWithdrawalProcessingResult {
  needNextProcess: boolean;
  withdrawalTxId: number;
}

export interface IWithdrawalWorkerOptions {
  readonly prepare: (worker: BaseWithdrawalWorker) => Promise<void>;
  readonly doProcess: (worker: BaseWithdrawalWorker) => Promise<IWithdrawalProcessingResult>;
}

export interface INep5WithdrawalWorkerOptions extends IWithdrawalWorkerOptions {
  readonly prepare: (worker: BaseWithdrawalWorker) => Promise<void>;
  readonly doProcess: (worker: BaseWithdrawalWorker) => Promise<IWithdrawalProcessingResult>;
  readonly contractAddress: string;
  readonly name: string;
  readonly symbol: string;
  readonly decimal: number;
  readonly totalSupply: string;

  readonly family: Currency;
  readonly networkSymbol: string;
  readonly type: string;
  readonly precision: number;
  readonly subversionName: string;
}
