import { Hex, add0x } from '@metamask/utils';
import { Interface, ParamType } from '@ethersproject/abi';

export type EvmMethodParam = {
  name?: string;
  type: string;
  value: any;
  children?: EvmMethodParam[];
};

export interface EvmMethodParsed {
  signature: string;
  name: string;
  params?: EvmMethodParam[];
}

export type EvmMethodParsedRef = EvmMethodParsed | undefined;

type FourByteResult = {
  created_at: string;
  text_signature: string;
};

type FourByteResponse = {
  results?: FourByteResult[];
};

class EvmMethodParser {
  async parse(transactionData: Hex): Promise<EvmMethodParsed | undefined> {
    let result: EvmMethodParsed | undefined = undefined;

    result = await this.parseAsync(transactionData);

    return result;
  }

  notParsed(): undefined {
    return undefined;
  }

  private async parseAsync(
    transactionData: Hex
  ): Promise<EvmMethodParsed | undefined> {
    const fourBytePrefix = transactionData.slice(0, 10) as Hex;
    if (fourBytePrefix.length < 10) {
      return undefined;
    }

    const signature = await this.getFourByteSignature(fourBytePrefix);
    if (!signature) {
      return undefined;
    }

    const name = signature.split('(')[0];

    let params: EvmMethodParam[] | undefined = undefined;
    try {
      const inputs = this.parseSignature(signature);

      const valueData = add0x(transactionData.slice(10));
      const values = Interface.getAbiCoder().decode(inputs, valueData) as any[];

      params = inputs.map((input, index) =>
        this.decodeParam(input, index, values)
      );
    } catch (_) {
      //do nothing
    }

    return {
      signature,
      name,
      params,
    };
  }

  private fourByteSignatureCache: { [fourBytePrefix: Hex]: string } = {};

  private async getFourByteSignature(
    fourBytePrefix: Hex
  ): Promise<string | undefined> {
    const cached = this.fourByteSignatureCache[fourBytePrefix];
    if (cached) {
      return cached;
    }

    let result: string | undefined = undefined;
    try {
      const url = `https://www.4byte.directory/api/v1/signatures/?hex_signature=${fourBytePrefix}`;
      const response = await fetch(url, {
        referrerPolicy: 'no-referrer-when-downgrade',
        body: null,
        method: 'GET',
        mode: 'cors',
      });
      if (response.ok) {
        const fourByteResponse = (await response.json()) as FourByteResponse;
        if (!fourByteResponse.results?.length) {
          return undefined;
        }

        fourByteResponse.results.sort((a, b) => {
          return new Date(a.created_at).getTime() <
            new Date(b.created_at).getTime()
            ? -1
            : 1;
        });

        result = fourByteResponse.results[0].text_signature;
      }
    } catch (_) {
      //do nothing
    }

    if (result) {
      this.fourByteSignatureCache[fourBytePrefix] = result;
    }
    return result;
  }

  private decodeParam(
    input: ParamType,
    index: number,
    values: any[]
  ): EvmMethodParam {
    const value = values[index] as any[];
    const { type, name } = input;

    let children = input.components?.map((child, childIndex) =>
      this.decodeParam(child, childIndex, value)
    );

    if (type.endsWith('[]')) {
      const childType = type.slice(0, -2);

      children = value.map((_arrayItem, arrayIndex) => {
        const childName = `Item ${arrayIndex + 1}`;

        return this.decodeParam(
          { ...input, name: childName, type: childType } as ParamType,
          arrayIndex,
          value
        );
      });
    }

    return {
      name,
      type,
      value,
      children,
    };
  }

  private parseSignature(signature: string): ParamType[] {
    let typeString = signature.slice(signature.indexOf('(') + 1, -1);
    const nested: string[] = [];

    while (typeString.includes('(')) {
      const nestedBrackets = this.findFirstNestedBrackets(typeString);

      if (!nestedBrackets) {
        break;
      }

      nested.push(nestedBrackets.value);

      typeString = `${typeString.slice(0, nestedBrackets.start)}${
        nested.length - 1
      }#${typeString.slice(nestedBrackets.end + 1)}`;
    }

    return this.createInput(typeString, nested);
  }

  private createInput(typeString: string, nested: string[]): ParamType[] {
    return typeString.split(',').map((value) => {
      const parts = value.split('#');

      const nestedIndex = parts.length > 1 ? parseInt(parts[0], 10) : undefined;
      const type = nestedIndex === undefined ? value : `tuple${parts[1] ?? ''}`;

      const components =
        nestedIndex === undefined
          ? undefined
          : this.createInput(nested[nestedIndex], nested);

      return {
        type,
        components,
      } as ParamType;
    });
  }

  private findFirstNestedBrackets(
    value: string
  ): { start: number; end: number; value: string } | undefined {
    let start = -1;

    for (let i = 0; i < value.length; i++) {
      if (value[i] === '(') {
        start = i;
      } else if (value[i] === ')' && start !== -1) {
        return {
          start,
          end: i,
          value: value.slice(start + 1, i),
        };
      }
    }

    return undefined;
  }
}

export const evmMethodParser = new EvmMethodParser();
