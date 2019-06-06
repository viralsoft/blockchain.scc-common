import { getLogger } from './Logger';

const logger = getLogger('BaseIntervalWorker');

export class BaseIntervalWorker {
  protected _isStarted: boolean = false;
  protected _nextTickTimer: number = 30000;

  public start(): void {
    if (this._isStarted) {
      logger.warn(`Trying to start processor twice: ${this.constructor.name}`);
      return;
    }

    this._isStarted = true;

    this.prepare()
      .then(res => {
        logger.info(`${this.constructor.name} finished preparing. Will start the first tick shortly...`);
        this.onTick();
      })
      .catch(err => {
        throw err;
      });
  }

  public getNextTickTimer(): number {
    return this._nextTickTimer;
  }

  protected setNextTickTimer(timeout: number): void {
    this._nextTickTimer = timeout;
  }

  protected onTick(): void {
    this.doProcess()
      .then(res => {
        setTimeout(() => {
          this.onTick();
        }, this.getNextTickTimer());
      })
      .catch(err => {
        logger.error(`======================================================================================`);
        logger.error(err);
        logger.error(`${this.constructor.name} something went wrong. The worker will be restarted shortly...`);
        logger.error(`======================================================================================`);
        setTimeout(() => {
          this.onTick();
        }, this.getNextTickTimer());
      });
  }

  // Should be overrided in derived classes
  // to setup connections, listeners, ... here
  protected async prepare(): Promise<void> {
    logger.warn(`${this.constructor.name}::prepare do nothing`);
  }

  protected async doProcess(): Promise<void> {
    logger.warn(`${this.constructor.name}::doProcess do nothing`);
  }
}

export default BaseIntervalWorker;
