import amqp from 'amqplib';
import util from 'util';
import { getAppId, getListTokenSymbols } from './EnvironmentData';
import CurrencyIntervalWorker from './CurrencyIntervalWorker';
import { IWithdrawalWorkerOptions } from './WithdrawalOptions';
import { getLogger } from './Logger';
import BaseGateway from './BaseGateway';
const logger = getLogger('BaseWithdrawalWorker');

export abstract class BaseWithdrawalWorker extends CurrencyIntervalWorker {
  public gateway: BaseGateway;

  protected readonly _options: IWithdrawalWorkerOptions;

  constructor(options: IWithdrawalWorkerOptions) {
    super();
    this._options = options;
    this._consumerQueue =
      getAppId() + '_' + this.getBaseConsumerQueue() + '_' + getListTokenSymbols().tokenSymbolsBuilder;
    this._producerQueue =
      getAppId() + '_' + this.getBaseProducerQueue() + '_' + getListTokenSymbols().tokenSymbolsBuilder;
  }

  /*protected*/ public async onConsumingMessage(msg: amqp.ConsumeMessage): Promise<boolean> {
    logger.info(`${this.constructor.name}::onConsumingMessage msg=${msg.content.toString()}`);
    await this.doProcess();

    // Messages are always consumed
    return true;
  }

  protected async prepare(): Promise<void> {
    await this._options.prepare(this);
    const protocol = process.env.RABBITMQ_SERVER_PROTOCOL || 'amqp';
    const hostname = process.env.RABBITMQ_SERVER_ADDRESS || '127.0.0.1';
    const port = parseInt(process.env.RABBITMQ_SERVER_PORT || '5672', 10);
    const options = {
      protocol,
      hostname,
      port,
    };
    await this.connect(options).catch(e => {
      logger.error(
        `${this.constructor.name}::prepare could not connect to rabbitmq server due to error: ${util.inspect(e)}`
      );
    });
  }

  protected async doProcess(): Promise<void> {
    const processResult = await this._options.doProcess(this);
    if (processResult.needNextProcess) {
      this.emitMessage(processResult.withdrawalTxId.toString());
    }
  }

  protected abstract getBaseConsumerQueue(): string;
  protected abstract getBaseProducerQueue(): string;
}

export default BaseWithdrawalWorker;
