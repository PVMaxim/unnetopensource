import { Ref, ref } from 'vue';
import { EIP155_SIGNING_METHODS } from '../wcMethods';

export enum EvmTypedDataSignMethodVersion {
  V1,
  V3,
  V4,
}

export interface EvmTypedDataParsed {
  domainName: string;
  primaryType: string;
  message: Record<string, any>;
  signMethodVersion: EvmTypedDataSignMethodVersion;
}

type GetDerefed<C extends Ref<any>> = C extends Ref<infer T> ? T : unknown;

export type EvmTypedDataParsedRef = ReturnType<typeof evmTypedDataParser.parse>;
export type EvmTypedDataParsedDerefed = GetDerefed<EvmTypedDataParsedRef>;

class EvmTypedDataParser {
  parse(typedData: any, signMethod: string) {
    const result = ref<EvmTypedDataParsed>();

    if (!typedData) {
      return result;
    }

    const { domain = {}, primaryType = '', message = {} } = typedData;
    const { name: domainName = '' } = domain;

    result.value = {
      domainName,
      primaryType,
      message,
      signMethodVersion:
        signMethod == EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4
          ? EvmTypedDataSignMethodVersion.V4
          : signMethod == EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3
          ? EvmTypedDataSignMethodVersion.V3
          : EvmTypedDataSignMethodVersion.V1,
    };

    return result;
  }
}

export const evmTypedDataParser = new EvmTypedDataParser();
