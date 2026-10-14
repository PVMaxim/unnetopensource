export class EvmChainId {
  private readonly numberValue: number;
  constructor(id: string | number) {
    this.numberValue = typeof id == 'string' ? parseInt(id) : Number(id);
  }

  asDecimalString() {
    return this.numberValue.toString();
  }

  asHexString() {
    return '0x' + this.numberValue.toString(16);
  }
}
