import BaseGateway from './BaseGateway';
import BaseWithdrawalWorker from './BaseWithdrawalWorker';
import { MessageQueueName } from './Enums';

export abstract class BaseWithdrawalVerifier extends BaseWithdrawalWorker {
  // Verifier consumes items from sent queue
  protected getBaseConsumerQueue(): string {
    return MessageQueueName.SENT_WITHDRAWAL;
  }

  // After verifying, publish messages to verified queue
  protected getBaseProducerQueue(): string {
    return MessageQueueName.VERIFIED_WITHDRAWAL;
  }
}

export default BaseWithdrawalVerifier;
