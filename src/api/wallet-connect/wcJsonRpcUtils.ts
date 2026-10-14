import { formatJsonRpcError } from '@json-rpc-tools/utils';
import { getSdkError, SdkErrorKey } from '@walletconnect/utils';
import { SessionRequestEventArgs } from './wcTypes';

function createErrorResponse(
  requestEvent: SessionRequestEventArgs,
  sdkErrorKey: SdkErrorKey
) {
  return formatJsonRpcError(requestEvent.id, getSdkError(sdkErrorKey).message);
}

export function createRejectResponse(requestEvent: SessionRequestEventArgs) {
  return createErrorResponse(requestEvent, 'USER_REJECTED');
}

export function createUnsupportedMethodResponse(
  requestEvent: SessionRequestEventArgs
) {
  return createErrorResponse(requestEvent, 'UNSUPPORTED_METHODS');
}
