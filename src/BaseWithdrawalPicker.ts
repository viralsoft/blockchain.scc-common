import BaseWithdrawalWorker from './BaseWithdrawalWorker';
import { MessageQueueName } from './Enums';

export abstract class BaseWithdrawalPicker extends BaseWithdrawalWorker {
  protected _nextTickTimer: number = 10000;

  // Default number of withdrawals can be grouped into a single transaction
  public getLimitPickingOnce(): number {
    return 1;
  }

  // Picker will consume message from unsigned withdrawal queue
  protected getBaseConsumerQueue(): string {
    return MessageQueueName.UNSIGNED_WITHDRAWAL;
  }

  // Group them into transactions, and publish messages to signing queue
  protected getBaseProducerQueue(): string {
    return MessageQueueName.SIGNING_WITHDRAWAL;
  }
}

export default BaseWithdrawalPicker;
