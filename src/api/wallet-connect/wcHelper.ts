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
      console.log("WalletConnect ClientID: ", clientId);
      localStorage.setItem("WALLETCONNECT_CLIENT_ID", clientId);
    } catch (error) {
      console.error(
        "Failed to set WalletConnect clientId in localStorage: ",
        error
      );
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
    console.log("onSessionProposal", proposal);

    wcModalQueue.push({
      type: WalletConnectModalType.SessionProposal,
      proposal,
    });
  }

  async onSessionRequest(requestEvent: SessionRequestEventArgs) {
    console.log("onSessionRequest", requestEvent);

    const { topic, params } = requestEvent;
    const { request } = params;
    const requestSession = (() => {
      try {
        return this.walletKit.engine.signClient.session.get(topic);
      } catch (error) {
        console.error("session.get error", error);
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
          console.error(
            `respondSessionRequest method=${request.method}`,
            error
          );
        }
    }
  }

  onSessionDelete(args: SessionDeleteEventArgs) {
    console.log("onSessionDelete", args);
    invalidateConnectedAppsCache();
  }

  onSessionPing(args: SessionPingEventArgs) {
    console.log("onSessionPing", args);
  }

  async onSessionAuthenticate(authRequest: SessionAuthenticateEventArgs) {
    console.log("onSessionAuthenticate", authRequest);
  }

  getConnectedApps(): ConnectedAppsList {
    const activeSessions: ConnectedAppSession[] = Object.values(
      this.walletKit.getActiveSessions()
    ).map((item) => ({
      peerMetadata: item.peer.metadata,
      topic: item.topic,
    }));

    // const activeSessions: ConnectedAppSession[] = Object.values(
    //   this.walletKit.core.pairing.getPairings()
    // )
    //   .map((item) => ({
    //     peerMetadata: item.peerMetadata,
    //     topic: item.topic,
    //   }))
    //   .filter((item) => !!item.peerMetadata) as ConnectedAppSession[];

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
        //TODO: error message 'Pairing expired. Please try again with new Connection URI'
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
    console.log("On before respondSessionRequest", request.topic, response);
    return this.walletKit.respondSessionRequest({
      topic: request.topic,
      response,
    });
  }

  test() {
    //-------------------------------------------
    //[revoke.cash] eth_sendTransaction approve 0
    //-------------------------------------------
    // this.onSessionRequest({
    //   id: 1740297497246460,
    //   topic: 'bb38b82ec90b8526351b9fdb422383533359eb21042cc9afa20aba1b4af40e0f',
    //   params: {
    //     request: {
    //       method: 'eth_sendTransaction',
    //       params: [
    //         {
    //           data: '0x095ea7b300000000000000000000000031c2f6fcff4f8759b3bd5bf0e1084a055615c7680000000000000000000000000000000000000000000000000000000000000000',
    //           from: '0x88ae68Ee4F3BA9235E799Fae5Ae0Bd009A0568B8',
    //           gas: '0x722e',
    //           to: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    //           value: '0x0',
    //         },
    //       ],
    //       expiryTimestamp: 1740297797,
    //     },
    //     chainId: 'eip155:56',
    //   },
    //   verifyContext: {
    //     verified: {
    //       verifyUrl: 'https://verify.walletconnect.org',
    //       validation: 'VALID',
    //       origin: 'https://revoke.cash',
    //       isScam: false,
    //     },
    //   },
    // });
    //
    //-----------------------------------------------
    //[pancakeswap] eth_sendTransaction approve unlim
    //-----------------------------------------------
    // this.onSessionRequest({
    //   id: 1740298358497153,
    //   topic: '42915a11cbdc414ef7f4b03e8b52c69118e1bea980c37be352671da5bbf24802',
    //   params: {
    //     request: {
    //       method: 'eth_sendTransaction',
    //       params: [
    //         {
    //           data: '0x095ea7b300000000000000000000000031c2f6fcff4f8759b3bd5bf0e1084a055615c768ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    //           from: '0x88ae68Ee4F3BA9235E799Fae5Ae0Bd009A0568B8',
    //           gas: '0xddbc',
    //           gasPrice: '0xb2d05e00',
    //           to: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
    //           value: '0x0',
    //         },
    //       ],
    //       expiryTimestamp: 1740298658,
    //     },
    //     chainId: 'eip155:56',
    //   },
    //   verifyContext: {
    //     verified: {
    //       verifyUrl: 'https://verify.walletconnect.org',
    //       validation: 'VALID',
    //       origin: 'https://pancakeswap.finance',
    //       isScam: false,
    //     },
    //   },
    // });
    //
    // //---------------------------------------------------------
    // //[pancakeswap] eth_sendTransaction execute token to native
    // //---------------------------------------------------------
    // this.onSessionRequest({
    //   id: 1740300823832281,
    //   topic: '42915a11cbdc414ef7f4b03e8b52c69118e1bea980c37be352671da5bbf24802',
    //   params: {
    //     request: {
    //       method: 'eth_sendTransaction',
    //       params: [
    //         {
    //           data: '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000067bae6c900000000000000000000000000000000000000000000000000000000000000030a000c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000e09fabb73bd3ade0a17ecc321fd13a19e81ce82000000000000000000000000ffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000000067e26f0a00000000000000000000000000000000000000000000000000000000000000060000000000000000000000001a0a18ac4becddbd6389559687d1a73d8927e4160000000000000000000000000000000000000000000000000000000067bae91200000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004115eeaa7c8737217fa290e933702019aa24855a63d33fcc0513d87e118ca38fbf29596ae01b67bb7247023c10195a18f2e7f95c3456c7e2c41ffdc4ebdd8bd4571b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000060901604c131c900000000000000000000000000000000000000000000000000005fc8997994bd00000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002b0e09fabb73bd3ade0a17ecc321fd13a19e81ce820001f4bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000088ae68ee4f3ba9235e799fae5ae0bd009a0568b800000000000000000000000000000000000000000000000000005fc8997994bd',
    //           from: '0x88ae68Ee4F3BA9235E799Fae5Ae0Bd009A0568B8',
    //           gas: '0x367c3',
    //           to: '0x1A0A18AC4BECDDbd6389559687d1A73d8927E416',
    //           value: '0x0',
    //         },
    //       ],
    //       expiryTimestamp: 1740301123,
    //     },
    //     chainId: 'eip155:56',
    //   },
    //   verifyContext: {
    //     verified: {
    //       verifyUrl: 'https://verify.walletconnect.org',
    //       validation: 'VALID',
    //       origin: 'https://pancakeswap.finance',
    //       isScam: false,
    //     },
    //   },
    // });
    //
    // //---------------------------------------------------------
    // //[pancakeswap] eth_sendTransaction execute native to token
    // //---------------------------------------------------------
    // this.onSessionRequest({
    //   id: 1740301103366442,
    //   topic: '42915a11cbdc414ef7f4b03e8b52c69118e1bea980c37be352671da5bbf24802',
    //   params: {
    //     request: {
    //       method: 'eth_sendTransaction',
    //       params: [
    //         {
    //           data: '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000067bae7da00000000000000000000000000000000000000000000000000000000000000020b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000005af3107a4000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000088ae68ee4f3ba9235e799fae5ae0bd009a0568b800000000000000000000000000000000000000000000000000005af3107a4000000000000000000000000000000000000000000000000000005b52d89db584a200000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002bbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c0001f40e09fabb73bd3ade0a17ecc321fd13a19e81ce82000000000000000000000000000000000000000000',
    //           from: '0x88ae68Ee4F3BA9235E799Fae5Ae0Bd009A0568B8',
    //           gas: '0x2a87d',
    //           to: '0x1A0A18AC4BECDDbd6389559687d1A73d8927E416',
    //           value: '0x5af3107a4000',
    //         },
    //       ],
    //       expiryTimestamp: 1740301403,
    //     },
    //     chainId: 'eip155:56',
    //   },
    //   verifyContext: {
    //     verified: {
    //       verifyUrl: 'https://verify.walletconnect.org',
    //       validation: 'VALID',
    //       origin: 'https://pancakeswap.finance',
    //       isScam: false,
    //     },
    //   },
    // });
    //
    // //--------------------------------------------------------
    // //[pancakeswap] eth_sendTransaction execute token to token
    // //--------------------------------------------------------
    // this.onSessionRequest({
    //   id: 1740301251972546,
    //   topic: '42915a11cbdc414ef7f4b03e8b52c69118e1bea980c37be352671da5bbf24802',
    //   params: {
    //     request: {
    //       method: 'eth_sendTransaction',
    //       params: [
    //         {
    //           data: '0x3593564c000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000067bae86d00000000000000000000000000000000000000000000000000000000000000020a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000e09fabb73bd3ade0a17ecc321fd13a19e81ce82000000000000000000000000ffffffffffffffffffffffffffffffffffffffff0000000000000000000000000000000000000000000000000000000067e270ad00000000000000000000000000000000000000000000000000000000000000060000000000000000000000001a0a18ac4becddbd6389559687d1a73d8927e4160000000000000000000000000000000000000000000000000000000067baeab500000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000004121aa6ec60dc5ccfc6ce601c6ceddfd6091a366387817ea48ab6ec6a1e0e2f69264a665f56b9629782645663b49f1a08f5e0da394e7a3151b63654ccda4f63ce51b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000088ae68ee4f3ba9235e799fae5ae0bd009a0568b80000000000000000000000000000000000000000000000000018240581304c72000000000000000000000000000000000000000000000000003df441c664aed800000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002b0e09fabb73bd3ade0a17ecc321fd13a19e81ce8200006455d398326f99059ff775485246999027b3197955000000000000000000000000000000000000000000',
    //           from: '0x88ae68Ee4F3BA9235E799Fae5Ae0Bd009A0568B8',
    //           gas: '0x3025b',
    //           to: '0x1A0A18AC4BECDDbd6389559687d1A73d8927E416',
    //           value: '0x0',
    //         },
    //       ],
    //       expiryTimestamp: 1740301551,
    //     },
    //     chainId: 'eip155:56',
    //   },
    //   verifyContext: {
    //     verified: {
    //       verifyUrl: 'https://verify.walletconnect.org',
    //       validation: 'VALID',
    //       origin: 'https://pancakeswap.finance',
    //       isScam: false,
    //     },
    //   },
    // });
    //
    // //-------------------------------------------
    // //[pancakeswap] eth_signTypedData_v4 Permit2
    // //-------------------------------------------
    // this.onSessionRequest({
    //   id: 1740227142334583,
    //   topic: '42915a11cbdc414ef7f4b03e8b52c69118e1bea980c37be352671da5bbf24802',
    //   params: {
    //     request: {
    //       method: 'eth_signTypedData_v4',
    //       params: [
    //         '0x88ae68Ee4F3BA9235E799Fae5Ae0Bd009A0568B8',
    //         '{"domain":{"name":"Permit2","chainId":56,"verifyingContract":"0x31c2f6fcff4f8759b3bd5bf0e1084a055615c768"},"message":{"details":{"token":"0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82","amount":"1461501637330902918203684832716283019655932542975","expiration":"1742819142","nonce":"5"},"spender":"0x1a0a18ac4becddbd6389559687d1a73d8927e416","sigDeadline":"1740228942"},"primaryType":"PermitSingle","types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"PermitSingle":[{"name":"details","type":"PermitDetails"},{"name":"spender","type":"address"},{"name":"sigDeadline","type":"uint256"}],"PermitDetails":[{"name":"token","type":"address"},{"name":"amount","type":"uint160"},{"name":"expiration","type":"uint48"},{"name":"nonce","type":"uint48"}]}}',
    //       ],
    //       expiryTimestamp: 1740227442,
    //     },
    //     chainId: 'eip155:56',
    //   },
    //   verifyContext: {
    //     verified: {
    //       verifyUrl: 'https://verify.walletconnect.org',
    //       validation: 'UNKNOWN',
    //       origin: 'https://pancakeswap.finance',
    //     },
    //   },
    // });
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
  // Skip proxy for already allowed or internal URLs
  if (url.startsWith('data:') || url.includes('.united.network')) return url;

  // Choose the appropriate proxy endpoint or query parameters based on intent
  return `https://getthirdparty.worker.united.network/proxy?url=${encodeURIComponent(url)}&type=${type}`;
}
