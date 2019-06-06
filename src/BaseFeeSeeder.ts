import BaseWithdrawalWorker from './BaseWithdrawalWorker';
import { MessageQueueName } from './Enums';
import amqp from 'amqplib';
import { getLogger } from './Logger';

const logger = getLogger('BaseFeeSeeder');

export abstract class BaseFeeSeeder extends BaseWithdrawalWorker {
  public requests: any[] = [];
  protected _nextTickTimer: number = 60 * 1000;
  public abstract getFeeReserveAccount(): any;

  /*protected*/ public async onConsumingMessage(msg: amqp.ConsumeMessage): Promise<boolean> {
    const content = msg.content.toString();
    logger.info(`${this.constructor.name}::onConsumingMessage msg=${content}`);
    const [method, depositId, toAddress] = content.split(',');
    if (method === 'seed') {
      const amount = this.getGateway().getAvgFee();
      this.requests.push({
        toAddress,
        amount,
        depositId,
      });
      await this.doProcess();
    }

    // Messages are always consumed
    return true;
  }

  protected getBaseConsumerQueue(): string {
    return MessageQueueName.COLLECTING_DEPOSIT;
  }

  // Group them into transactions, and publish messages to signing queue
  protected getBaseProducerQueue(): string {
    return '';
  }
}

export default BaseFeeSeeder;
