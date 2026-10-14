import {
  MessageTypes,
  SignTypedDataVersion,
  TypedDataUtils,
  TypedDataV1,
  TypedMessage,
  typedSignatureHash,
} from '@metamask/eth-sig-util';
import { hexToBytes } from '@metamask/utils';

export function getTypedDataHashToSign<
  V extends SignTypedDataVersion,
  T extends MessageTypes
>({
  data,
  version,
}: {
  data: V extends 'V1' ? TypedDataV1 : TypedMessage<T>;
  version: V;
}): string {
  const result =
    version === SignTypedDataVersion.V1
      ? Buffer.from(hexToBytes(typedSignatureHash(data as TypedDataV1)))
      : TypedDataUtils.eip712Hash(data as TypedMessage<T>, version);
  return result.toString('hex');
}


