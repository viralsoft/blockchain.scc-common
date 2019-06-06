export enum TransactionStatus {
  UNKNOWN = 0,
  CONFIRMING = 1,
  COMPLETED = 2,
  FAILED = 3,
}

export enum MessageQueueName {
  UNSIGNED_WITHDRAWAL = 'unsigned_withdrawal',
  SIGNING_WITHDRAWAL = 'signing_withdrawal',
  SIGNED_WITHDRAWAL = 'signed_withdrawal',
  SENT_WITHDRAWAL = 'sent_withdrawal',
  VERIFIED_WITHDRAWAL = 'verified_withdrawal',

  COLLECTING_DEPOSIT = 'collecting_deposit',
  COLLECTED_DEPOSIT = 'collected_deposit',
}

export enum TokenType {
  ERC20 = 'erc20',
  OMNI = 'omni',
  TRC20 = 'trc20',
  NEP5 = 'nep5',
  EOS = 'eos',
}

export enum HotWalletType {
  Normal = 'normal',
  Multisig = 'multisig',
}

export enum TransferType {
  ACCOUNT_BASED = 'account',
  UTXO_BASED = 'utxo',
}

interface IError {
  [index: string]: ErrorDetails;
}

class ErrorDetails {
  public message: string;
  public code: number;
  public cause: string;
  constructor(message: string, code: number) {
    this.message = message;
    this.code = code;
  }
  public toString(): string {
    return this.cause ? this.message + ` due to ${this.cause}` : this.message;
  }

  public due(reason: string) {
    this.cause = reason;
  }
}

export const Errors: IError = {};
Errors.unImplementedError = new ErrorDetails('implement me', 1818);
Errors.rpcError = new ErrorDetails('rpc node error', 1819);
Errors.apiEndpointError = new ErrorDetails('api node error', 1819);
Errors.missPreparedData = new ErrorDetails('some missing on prepared data from database', 1820);
Errors.apiDataNotUpdated = new ErrorDetails('api return some not updated data', 1821);

Errors.txInvalid = new ErrorDetails('withdrawal transaction invalid', 2818);
Errors.txSentFailed = new ErrorDetails('send raw transaction failed', 2819);
Errors.notEnoughFeeError = new ErrorDetails('transaction can not be constructed because of fee', 2820);
