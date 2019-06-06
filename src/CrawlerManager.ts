import { getLogger } from './Logger';
import { v1 as uuid } from 'uuid';
import BaseCrawler from './BaseCrawler';
import CrawlerOptions from './CrawlerOptions';
import { getCurrency, getListTokenSymbols } from './EnvironmentData';
import { Errors } from './Enums';
import { subForTokenChanged } from './RedisChannel';
import Currency from './Currency';

const logger = getLogger('CrawlerManager');

// Store in-progress block
const LATEST_PROCESSED_BLOCK = new Map<string, number>();

class CrawlerManager {
  private _id: string;
  private _isStarted: boolean;
  private _crawlerOptions: CrawlerOptions;

  constructor() {
    // Generate unique id for each process
    this._id = uuid();
    this._isStarted = false;
    // redis
    subForTokenChanged();
  }

  /**
   * Ignite the crawler engine
   * @param {Class} CrawlerClass - the class of crawler will be running
   */
  public start<T extends BaseCrawler>(CrawlerClass: new (options: CrawlerOptions) => T, options: CrawlerOptions): void {
    // Prevent to start multiple times
    if (this._isStarted) {
      return;
    }

    this._isStarted = true;
    this._crawlerOptions = options;
    this.doCrawl(CrawlerClass, options);
  }

  /**
   * Enter the loop
   * @param {Class} CrawlerClass - the class of crawler will be running
   */
  public doCrawl<T extends BaseCrawler>(
    CrawlerClass: new (options: CrawlerOptions) => T,
    options: CrawlerOptions
  ): void {
    this._doCrawl(CrawlerClass, options)
      .then(timeout => {
        setTimeout(() => {
          this.doCrawl(CrawlerClass, options);
        }, timeout);
      })
      .catch(err => {
        this.errorToString(err);
        this.handleError(err);
        setTimeout(() => {
          this.doCrawl(CrawlerClass, options);
        }, 6000);
      });
  }

  /**
   * With some can be handled error
   * @param err
   */
  public handleError(err: any) {
    if (err.code === Errors.missPreparedData.code) {
      this._crawlerOptions
        .prepareWalletBalanceAll(getCurrency(), getListTokenSymbols().tokenSymbols)
        .then()
        .catch(e => {
          throw e;
        });
    }
  }

  /**
   * Log error to console
   * @param err
   */
  public errorToString(err: any) {
    if (err.code === Errors.apiDataNotUpdated.code) {
      logger.warn(Errors.apiDataNotUpdated.toString());
      return;
    }
    logger.error(`==============================================================================`);
    logger.error(err ? err.toString() : 'Error undefined');
    if (err instanceof Error) {
      logger.error(err.stack);
    }
    logger.error(`Something went wrong while crawling data. Crawler will be restarted shortly...`);
    logger.error(`==============================================================================`);
  }

  /**
   * The crawler's main loop
   * @param {Class} CrawlerClass - the class of crawler will be running
   * @returns {Number} timeout - the timeout duration until the next tick
   */
  public async _doCrawl<T extends BaseCrawler>(
    CrawlerClass: new (options: CrawlerOptions) => T,
    options: CrawlerOptions
  ): Promise<number> {
    const crawler = new CrawlerClass(options);
    const duration = 300000;
    const timer = setTimeout(() => {
      logger.error(`Timeout duration (${duration}ms) is exceeded. Crawler will be restarted shortly...`);
      process.exit(1);
    }, duration);

    // Check RPC node...
    const check = await crawler.getGateway().checkRPCNode(getListTokenSymbols().tokenSymbolsBuilder as Currency);
    if (!check) {
      clearTimeout(timer);
      throw Errors.rpcError;
    }

    const latestNetworkBlock = await crawler.getLatestBlockOnNetwork();

    let latestProcessedBlock = LATEST_PROCESSED_BLOCK.get(this._id);

    if (!latestProcessedBlock && process.env.FORCE_CRAWL_BLOCK) {
      latestProcessedBlock = parseInt(process.env.FORCE_CRAWL_BLOCK, 10);
    }

    if (!latestProcessedBlock || isNaN(latestProcessedBlock)) {
      latestProcessedBlock = await options.getLatestCrawledBlockNumber(crawler);
    }

    /**
     * Start with the next block of the latest processed one
     */
    const fromBlockNumber = latestProcessedBlock + 1;

    /**
     * If crawled the newest block already
     * Wait for a period that is equal to average block time
     * Then try crawl again (hopefully new block will be available then)
     */
    if (fromBlockNumber > latestNetworkBlock) {
      logger.info(
        `Block <${fromBlockNumber}> is the newest block can be processed (on network: ${latestNetworkBlock}). Wait for the next tick...`
      );
      clearTimeout(timer);
      return crawler.getAverageBlockTime();
    }

    /**
     * Try to process several blocks at once, up to the newest one on the network
     */
    let toBlockNumber = latestProcessedBlock + crawler.getBlockNumInOneGo();
    if (toBlockNumber > latestNetworkBlock) {
      toBlockNumber = latestNetworkBlock;
    }

    /**
     * Actual crawl and process blocks
     * about 10 minutes timeout based on speed of gateway
     */
    try {
      await crawler.processBlocks(fromBlockNumber, toBlockNumber, latestNetworkBlock);
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
    /**
     * Safe block number is the highest crawled block that has enough confirmations
     */
    let safeBlockNumber = latestNetworkBlock - crawler.getRequiredConfirmations();
    if (safeBlockNumber > toBlockNumber) {
      safeBlockNumber = toBlockNumber;
    }
    const recentBlock = await crawler.getGateway().getOneBlock(safeBlockNumber);
    if (recentBlock) {
      await crawler.getOptions().onBlockCrawled(crawler, recentBlock);
    }

    /**
     * Cache the latest processed block number
     * Do the loop again in the next tick
     */
    LATEST_PROCESSED_BLOCK.set(this._id, safeBlockNumber);
    let timeout = 1;
    if (toBlockNumber >= latestNetworkBlock) {
      logger.info(`Have processed newest block already. Will wait for a while until next check...`);
      timeout = crawler.getAverageBlockTime();
    }

    clearTimeout(timer);
    return timeout;
  }
}

export default CrawlerManager;
export { CrawlerManager };
