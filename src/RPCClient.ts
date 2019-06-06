import Axios, { AxiosRequestConfig } from 'axios';
import { RpcErrorCatch } from './RPCHelper';

export interface IRpcResponse<T = any> {
  jsonrpc: string;
  id: number | string;
  result: T;
  error?: IRpcErrorStruct;
}

export interface IRpcErrorStruct {
  code: number;
  message: string;
}

export interface IRpcRequest {
  jsonrpc: '2.0' | '1.0';
  id: number | string;
  method: string;
  params: any[];
}

export interface IRpcConfig {
  ip?: string;
  port?: string;
  user?: string;
  pass?: string;
}

export abstract class RPCClient {
  protected URL: string;
  protected reqConfig: AxiosRequestConfig;
  constructor(
    public user: string,
    public pass: string,
    public ip: string,
    public port: string,
    public coinName: string
  ) {
    this.reqConfig = {
      auth: {
        password: this.pass,
        username: this.user,
      },
      timeout: 60000,
    };

    this.URL = /^http.+$/.test(this.ip) ? `${this.ip}:${this.port}` : `http://${this.ip}:${this.port}`;
  }

  /**
   * JSON-RPC call func
   * @param method RPC Request Method
   * @param params RPC Request Params
   * @param id RPC Request id
   * @returns RPCResponse<T>
   * @throws Response non-2xx response or request error
   */
  public async RpcCall<T = any>(method: string, params?: any[], id?: number | string) {
    const reqData: IRpcRequest = {
      id: id || Date.now(),
      jsonrpc: '2.0',
      method,
      params: params || [],
    };

    try {
      const ret = await Axios.post<IRpcResponse<T>>(this.URL, reqData, this.reqConfig);
      return ret.data;
    } catch (err) {
      throw RpcErrorCatch(err, this.URL, reqData, this.coinName);
    }
  }
}

export default RPCClient;
