import BaseWithdrawalWorker from './BaseWithdrawalWorker';
import { MessageQueueName } from './Enums';

export abstract class BaseWithdrawalSigner extends BaseWithdrawalWorker {
  // Signer consume withdrawals that have signing status
  protected getBaseConsumerQueue(): string {
    return MessageQueueName.SIGNING_WITHDRAWAL;
  }

  // Sign them, and then publish messages to signed queue
  protected getBaseProducerQueue(): string {
    return MessageQueueName.SIGNED_WITHDRAWAL;
  }
}

export default BaseWithdrawalSigner;
