import BaseGateway from './BaseGateway';
import BaseWithdrawalWorker from './BaseWithdrawalWorker';
import { MessageQueueName } from './Enums';

export abstract class BaseDepositCollectorVerifier extends BaseWithdrawalWorker {
  // Verifier consumes items from sent queue
  protected getBaseConsumerQueue(): string {
    // return MessageQueueName.COLLECTING_DEPOSIT;
    return '';
  }

  // After verifying, publish messages to verified queue
  protected getBaseProducerQueue(): string {
    return MessageQueueName.COLLECTED_DEPOSIT;
  }
}

export default BaseDepositCollectorVerifier;
