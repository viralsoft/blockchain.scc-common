import BaseIntervalWorker from './BaseIntervalWorker';
import BaseMQConsumer from './BaseMQConsumer';
import BaseMQProducer from './BaseMQProducer';
import BaseGateway from './BaseGateway';
import { Options } from 'amqplib';
import { getGateway } from './EnvironmentData';
import { subForTokenChanged } from './RedisChannel';

const MixedClass = BaseMQConsumer(BaseMQProducer(BaseIntervalWorker));

export abstract class CurrencyIntervalWorker extends MixedClass {
  protected constructor() {
    super();
    subForTokenChanged();
  }
  public abstract gatewayClass(): any;
  /**
   * @param currency
   */
  public getGateway(currency?: string): BaseGateway {
    return getGateway(currency);
  }

  protected async connect(options: Options.Connect): Promise<void> {
    await Promise.all([this.setupConsumer(options), this.setupProducer(options)]);
  }
}

export default CurrencyIntervalWorker;
