import { SignClientTypes } from '@walletconnect/types';

export type SessionProposalEventArgs =
  SignClientTypes.EventArguments['session_proposal'];

export type SessionRequestEventArgs =
  SignClientTypes.EventArguments['session_request'];

export type SessionDeleteEventArgs =
  SignClientTypes.EventArguments['session_delete'];

export type SessionAuthenticateEventArgs =
  SignClientTypes.EventArguments['session_authenticate'];

export type SessionPingEventArgs =
  SignClientTypes.EventArguments['session_ping'];
