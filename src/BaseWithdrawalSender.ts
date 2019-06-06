import BaseGateway from './BaseGateway';
import BaseWithdrawalWorker from './BaseWithdrawalWorker';
import { MessageQueueName } from './Enums';

export abstract class BaseWithdrawalSender extends BaseWithdrawalWorker {
  // Sender consumes withdrawals that have signed status
  protected getBaseConsumerQueue(): string {
    return MessageQueueName.SIGNED_WITHDRAWAL;
  }

  // Send them to network via gateway, then publish messages to sent queue
  protected getBaseProducerQueue(): string {
    return MessageQueueName.SENT_WITHDRAWAL;
  }
}

export default BaseWithdrawalSender;
