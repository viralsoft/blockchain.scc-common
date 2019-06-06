export class Account {
  public readonly address: string;
  public readonly privateKey: string;

  constructor(privateKey: string, address: string) {
    this.address = address;
    this.privateKey = privateKey;
  }
}

export default Account;
