import { BigNumberish, ethers } from 'ethers';
import { EvmActorRecognized } from './evmActorRecognizer';

export type EvmAmountRef = EvmAmount | undefined;

export class EvmAmount {
  private readonly decimalUnits: string;

  constructor(
    private readonly units: BigNumberish,
    private readonly decimals: number
  ) {
    this.decimalUnits = ethers.formatUnits(this.units, 0);
  }

  static forTokenActorRef(
    units: BigNumberish,
    tokenActor: EvmActorRecognized | undefined
  ): EvmAmountRef {
    return tokenActor?.asToken
      ? new EvmAmount(units, tokenActor.asToken.decimals)
      : undefined;
  }

  isZero(): boolean {
    return this.decimalUnits == '0';
  }

  asDecimalUnits(): string {
    return this.decimalUnits;
  }

  asDecimal(): string {
    return ethers.formatUnits(this.decimalUnits, this.decimals);
  }

  getDecimals(): number {
    return this.decimals;
  }
}
