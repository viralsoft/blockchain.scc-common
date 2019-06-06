import express from 'express';
import morgan from 'morgan';
import util from 'util';
import BaseGateway from './BaseGateway';
import { getCurrency, getCurrencyConfig, getGateway, getTokenBySymbol } from './EnvironmentData';
import * as URL from 'url';
import { getLogger } from './Logger';
import { subForTokenChanged } from './RedisChannel';

const logger = getLogger('BaseWebServer');

export abstract class BaseWebServer {
  public host: string;
  public port: number;
  protected app: express.Express = express();

  public constructor() {
    const config = getCurrencyConfig(getCurrency());
    if (!config) {
      throw new Error(`Cannot find configuration for ${getCurrency().toUpperCase()} at config table`);
    }

    const apiEndpoint = URL.parse(`${config.internalApiEndpoint}`);
    if (!apiEndpoint.protocol || !apiEndpoint.hostname || !apiEndpoint.port) {
      logger.info(`Set api endpoint: ${config.internalApiEndpoint}. Need corrected format: {host}:{port}`);
      throw new Error(`Api endpoint for ${getCurrency().toUpperCase()} have un-correct format`);
    }
    this.host = apiEndpoint.hostname;
    this.port = parseInt(apiEndpoint.port, 10);
    this.setup();

    // redis
    subForTokenChanged();
  }

  public getGateway(currency?: string): BaseGateway {
    return getGateway(currency);
  }

  public start() {
    this.app.listen(this.port, this.host, () => {
      console.log(`server started at http://${this.host}:${this.port}`);
    });
  }

  protected async createNewAddress(req: any, res: any) {
    const coin: string = req.params.coin;
    const address = await this.getGateway(coin).createAccountAsync();
    res.json(address);
  }

  protected async getAddressBalance(req: any, res: any) {
    const { coin, address } = req.params;
    const balance = await this.getGateway(coin).getAddressBalance(address);
    res.json({ balance });
  }

  protected async getCurrencyInfo(req: any, res: any) {
    const { address } = req.params;
    const result = await this.getGateway().getCurrencyInfo(address);
    res.json(result);
  }

  protected async validateAddress(req: any, res: any) {
    const { coin, address } = req.params;
    const isValid = await this.getGateway(coin).isValidAddressAsync(address);
    res.json({ isValid });
  }

  protected async getTransactionDetails(req: any, res: any) {
    const { coin, txid } = req.params;

    // TODO: Update check txid
    const tx = await this.getGateway(coin).getOneTransaction(txid);
    if (!tx) {
      return res.status(404).json({ error: `Transaction not found: ${txid}` });
    }

    const entries: any[] = [];
    const extractedEntries = tx.extractEntries();
    extractedEntries.forEach(e => {
      entries.push({
        address: e.toAddress,
        value: parseFloat(e.amount),
        valueString: e.amount,
      });
    });

    let resObj = {
      id: txid,
      date: '',
      timestamp: tx.block.timestamp,
      blockHash: tx.block.hash,
      blockHeight: tx.block.number,
      confirmations: tx.confirmations,
      entries,
    };
    resObj = { ...resObj, ...tx.extractAdditionalField() };

    return res.json(resObj);
  }

  protected async normalizeAddress(req: any, res: any) {
    const address: string = req.params.address;
    const checksumAddress = await this.getGateway().normalizeAddress(address);
    logger.info(
      `WebService::convertChecksumAddress params=${JSON.stringify(req.params)} result=${JSON.stringify(
        checksumAddress
      )}`
    );

    return res.json(checksumAddress);
  }

  protected setup() {
    this.app.use(morgan('dev'));

    this.app.get('/api/:coin/address', async (req, res) => {
      try {
        await this.createNewAddress(req, res);
      } catch (e) {
        logger.error(`createNewAddress err=${util.inspect(e)}`);
        res.status(500).json({ error: e.message || e.toString() });
      }
    });

    this.app.get('/api/:coin/address/:address/balance', async (req, res) => {
      try {
        await this.getAddressBalance(req, res);
      } catch (e) {
        logger.error(`getAddressBalance err=${util.inspect(e)}`);
        res.status(500).json({ error: e.message || e.toString() });
      }
    });

    this.app.get('/api/:coin/address/:address/validate', async (req, res) => {
      try {
        await this.validateAddress(req, res);
      } catch (e) {
        logger.error(`validateAddress err=${util.inspect(e)}`);
        res.status(500).json({ error: e.message || e.toString() });
      }
    });

    this.app.get('/api/:coin/tx/:txid', async (req, res) => {
      try {
        await this.getTransactionDetails(req, res);
      } catch (e) {
        logger.error(`getTransactionDetails err=${util.inspect(e)}`);
        res.status(500).json({ error: e.message || e.toString() });
      }
    });

    this.app.get('/api/currency_config/:address', async (req, res) => {
      try {
        await this.getCurrencyInfo(req, res);
      } catch (e) {
        logger.error(`err=${util.inspect(e)}`);
        res.status(500).json({ error: e.message || e.toString() });
      }
    });

    this.app.get('/api/:coin/:address/normalized', async (req, res) => {
      try {
        await this.normalizeAddress(req, res);
      } catch (e) {
        logger.error(`convertChecksumAddress err=${util.inspect(e)}`);
        res.status(500).json({ error: e.toString() });
      }
    });
  }
}
