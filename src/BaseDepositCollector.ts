import BaseWithdrawalWorker from './BaseWithdrawalWorker';
import { MessageQueueName } from './Enums';
import BN from 'bignumber.js';

export abstract class BaseDepositCollector extends BaseWithdrawalWorker {
  protected _nextTickTimer: number = 10 * 1000;
  public abstract getAddressEntity(): any;
  public abstract getNextCheckAtAmount(): number;

  /*
   * Check whether a deposit is collectable
   * There're a case the crawler crawl old deposit, which is already collected
   **/
  public async isCollectable(txid: string, address: string, amount: string): Promise<boolean> {
    const gateway = this.getGateway();
    const balance = await gateway.getAddressBalance(address);
    const balanceNumber = new BN(balance);
    const amountNumber = new BN(amount);

    return balanceNumber.gte(amountNumber);
  }

  protected getBaseConsumerQueue(): string {
    return '';
  }

  // Group them into transactions, and publish messages to signing queue
  protected getBaseProducerQueue(): string {
    return MessageQueueName.COLLECTING_DEPOSIT;
  }
}

export default BaseDepositCollector;
