import { add0xPrefix } from "../../evm/common";
import { convertSignatureForEvm } from "../../evm/request";
import { Secp256k1RequestChunk } from "../../request-chunks";
import { Request } from "../../common";

export class EvmTypedDataRequestSecp implements Request {
  readonly chunks: Secp256k1RequestChunk[];
  protected _hash: string;
  protected _publicKey: string;

  private readonly _afterSign?: (signature: string) => Promise<any>;

  constructor(
    args: { hash: string; publicKey: string },
    afterSign?: (signature: string) => Promise<any>
  ) {
    this.chunks = [
      new Secp256k1RequestChunk({
        hash: args.hash,
        expectedPublicKey: args.publicKey,
      }),
    ];

    this._hash = args.hash;
    this._publicKey = args.publicKey;
    this._afterSign = afterSign;
  }

  async estimateFee(): Promise<string> {
    return "0";
  }

  protected async buildSignature(): Promise<string> {
    return add0xPrefix(
      convertSignatureForEvm({
        dataHash: this._hash,
        signature: this.chunks[0].signature!,
        publicKey: this._publicKey,
      })
    );
  }

  async send(): Promise<string> {
    const signature = await this.buildSignature();

    if (this._afterSign) {
      await this._afterSign(signature);
    }

    return "";
  }
}
