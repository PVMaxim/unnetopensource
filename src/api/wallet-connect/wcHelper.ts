import { IWalletKit, WalletKit } from "@reown/walletkit";
import { Core } from "@walletconnect/core";
import { getSdkError, parseUri } from "@walletconnect/utils";
import { CoreTypes, SessionTypes } from "@walletconnect/types";
import { JsonRpcResponse } from "@walletconnect/jsonrpc-utils";
import {
  SessionAuthenticateEventArgs,
  SessionDeleteEventArgs,
  SessionPingEventArgs,
  SessionProposalEventArgs,
  SessionRequestEventArgs,
} from "./wcTypes";

import { EIP155_SIGNING_METHODS, SOLANA_SIGNING_METHODS, TRON_SIGNING_METHODS, TON_SIGNING_METHODS } from "./wcMethods";
import { createUnsupportedMethodResponse } from "./wcJsonRpcUtils";
import { WalletConnectModalType, wcModalQueue } from "./wcModalQueue";
import { ref, watchEffect } from "vue";

export interface ConnectedAppSession {
  peerMetadata: CoreTypes.Metadata;
  topic: string;
}

export type ConnectedAppsList = {
  key: string;
  sessions: ConnectedAppSession[];
}[];

export class WalletConnectHelper {
  private constructor(private readonly walletKit: IWalletKit) { }

  static async create(relayUrl?: string) {
    const core = new Core({
      projectId: UNITED_CONNECT_PROJECT_ID,
      relayUrl: relayUrl ?? "wss://relay.walletconnect.com",
    });

    const walletKit = await WalletKit.init({
      core,
      metadata: {
        name: "United Wallet",
        description:
          "Secure hardware wallet, simple crypto management, and smart blockchain integration.",
        url: (typeof window !== "undefined" && window.location?.origin) || "https://walletconnect.com",
        icons: [],
      },
      signConfig: {
        disableRequestQueue: true,
      },
    });

    const instance = new WalletConnectHelper(walletKit);

    try {
      const clientId =
        await walletKit.engine.signClient.core.crypto.getClientId();
      localStorage.setItem("WALLETCONNECT_CLIENT_ID", clientId);
    } catch (error) {
    }

    walletKit.on("session_proposal", (args) =>
      instance.onSessionProposal(args)
    );

    walletKit.on("session_request", (args) => instance.onSessionRequest(args));

    walletKit.on("session_delete", (args) => instance.onSessionDelete(args));

    walletKit.on("session_authenticate", (args) =>
      instance.onSessionAuthenticate(args)
    );

    walletKit.engine.signClient.events.on("session_ping", (args) =>
      instance.onSessionPing(args)
    );

    return new WalletConnectHelper(walletKit);
  }

  onSessionProposal(proposal: SessionProposalEventArgs) {

    wcModalQueue.push({
      type: WalletConnectModalType.SessionProposal,
      proposal,
    });
  }

  async onSessionRequest(requestEvent: SessionRequestEventArgs) {

    const { topic, params } = requestEvent;
    const { request } = params;
    const requestSession = (() => {
      try {
        return this.walletKit.engine.signClient.session.get(topic);
      } catch (error) {
        return undefined;
      }
    })();

    switch (request.method) {
      case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
        wcModalQueue.push({
          type: WalletConnectModalType.EvmSendTransaction,
          requestEvent,
          requestSession,
        });
        return;

      case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
      case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
      case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
        wcModalQueue.push({
          type: WalletConnectModalType.EvmSignTypedData,
          requestEvent,
          requestSession,
        });
        return;
      case TRON_SIGNING_METHODS.TRON_SIGN_TRANSACTION:
        wcModalQueue.push({
          type: WalletConnectModalType.TronSignTypedData,
          requestEvent,
          requestSession,
        });
        return;
      case SOLANA_SIGNING_METHODS.SIGN_TRANSACTION:
        wcModalQueue.push({
          type: WalletConnectModalType.SolanaSignTransaction,
          requestEvent,
          requestSession,
        })
        return;
      case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
        wcModalQueue.push({
          type: WalletConnectModalType.EvmPersonalSign,
          requestEvent,
          requestSession,
        })
        return;
      case TON_SIGNING_METHODS.TON_SEND_MESSAGE:
        wcModalQueue.push({
          type: WalletConnectModalType.TonSendTransaction,
          requestEvent,
          requestSession,
        })
        return;
      case TON_SIGNING_METHODS.TON_SIGN_DATA:
        wcModalQueue.push({
          type: WalletConnectModalType.TonSignData,
          requestEvent,
          requestSession,
        })
        return;

      default:
        const response = createUnsupportedMethodResponse(requestEvent);
        try {
          await this.respondSessionRequest(requestEvent, response);
        } catch (error) {
        }
    }
  }

  onSessionDelete(_args: SessionDeleteEventArgs) {
    invalidateConnectedAppsCache();
  }

  onSessionPing(_args: SessionPingEventArgs) {
  }

  async onSessionAuthenticate(_authRequest: SessionAuthenticateEventArgs) {
  }

  getConnectedApps(): ConnectedAppsList {
    const activeSessions: ConnectedAppSession[] = Object.values(
      this.walletKit.getActiveSessions()
    ).map((item) => ({
      peerMetadata: item.peer.metadata,
      topic: item.topic,
    }));

    const resultAsObj = activeSessions.reduce(
      (
        prev: { [key: string]: ConnectedAppSession[] },
        session: ConnectedAppSession
      ) => {
        const { name, url } = session?.peerMetadata;
        const key = `${name}@${url}`;

        const prevSessions = prev[key] || [];
        return { ...prev, [key]: [...prevSessions, session] };
      },
      {}
    );

    const result = Object.entries(resultAsObj)
      .map((item) => ({ key: item[0], sessions: item[1] }))
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((item) => ({
        key: `${item.key}(${item.sessions.map((s) => s.topic).join("|")})`,
        sessions: item.sessions,
      }));

    return result;
  }

  async connect(uri: string) {
    const { topic: pairingTopic } = parseUri(uri);

    const pairingExpiredListener = ({ topic }: { topic?: string }) => {
      if (pairingTopic === topic) {
        this.walletKit.core.pairing.events.removeListener(
          "pairing_expire",
          pairingExpiredListener
        );
      }
    };

    this.walletKit.once("session_proposal", () => {
      this.walletKit.core.pairing.events.removeListener(
        "pairing_expire",
        pairingExpiredListener
      );
    });

    this.walletKit.core.pairing.events.on(
      "pairing_expire",
      pairingExpiredListener
    );
    return this.walletKit.pair({ uri });
  }

  async approveSession(
    proposal: SessionProposalEventArgs,
    namespaces: Record<string, SessionTypes.Namespace>,
    sessionProperties?: Record<string, string>
  ): Promise<void> {
    await this.walletKit.approveSession({
      id: proposal.id,
      namespaces,
      sessionProperties,
    });
  }

  rejectSession(proposal: SessionProposalEventArgs): Promise<void> {
    return this.walletKit.rejectSession({
      id: proposal.id,
      reason: getSdkError("USER_REJECTED_METHODS"),
    });
  }

  disconnectSession(topic: string): Promise<void> {
    return this.walletKit.disconnectSession({
      topic,
      reason: getSdkError("USER_DISCONNECTED"),
    });
  }

  respondSessionRequest(
    request: SessionRequestEventArgs,
    response: JsonRpcResponse
  ): Promise<void> {
    return this.walletKit.respondSessionRequest({
      topic: request.topic,
      response,
    });
  }

  test() {
  }
}

export const walletConnectHelper = ref<WalletConnectHelper>();

export const connectedAppsCache = ref<ConnectedAppsList>([]);
const isConnectedAppsCacheValid = ref<boolean>(false);
watchEffect(() => {
  if (isConnectedAppsCacheValid.value) {
    return;
  }

  if (!walletConnectHelper.value) {
    return;
  }
  connectedAppsCache.value = walletConnectHelper.value.getConnectedApps();
  isConnectedAppsCacheValid.value = true;
});

export async function initWalletConnectHelper(relayUrl?: string) {
  if (!walletConnectHelper.value) {
    walletConnectHelper.value = await WalletConnectHelper.create(relayUrl);
  }
}

export function invalidateConnectedAppsCache() {
  isConnectedAppsCacheValid.value = false;
}

export function getProxiedUrl(url: string | undefined, type: 'image' | 'api' = 'api'): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.includes('.united.network')) return url;

  return `https://getthirdparty.worker.united.network/proxy?url=${encodeURIComponent(url)}&type=${type}`;
}
