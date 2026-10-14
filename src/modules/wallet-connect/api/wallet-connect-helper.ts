import { IWalletKit, WalletKit } from "@reown/walletkit";
import { Core } from '@walletconnect/core';
import { SignClientTypes } from '@walletconnect/types';
import { buildApprovedNamespaces, getSdkError, parseUri } from '@walletconnect/utils';
import { getSupportedNamespaces } from './wallet-connect-namespaces';

export class WalletConnectHelper {
    private static instance: WalletConnectHelper;

    static isReady() {
        return !!(WalletConnectHelper.instance);
    }

    static required() {
        if (!WalletConnectHelper.instance) {
            throw 'WalletConnectHelper is not created';
        }

        return WalletConnectHelper.instance;
    }

    static async recreateIfNeeded(relayUrl?: string) {
        if (!WalletConnectHelper.instance) {
            WalletConnectHelper.instance = await this.create(relayUrl);
        }

        return WalletConnectHelper.instance;
    }

    private constructor(private readonly walletKit: IWalletKit) { }

    private static async create(relayUrl?: string) {

        const core = new Core({
            projectId: UNITED_CONNECT_PROJECT_ID,
            relayUrl: relayUrl ?? 'wss://relay.walletconnect.com',
            logger: 'trace',
        });

        const walletKit = await WalletKit.init({
            core,
            metadata: {
                name: 'united.network',
                description: 'WalletConnect for united.network',
                url: 'https://walletconnect.com/', //TODO
                icons: ['https://avatars.githubusercontent.com/u/37784886'], //TODO
            },
            signConfig: {
                disableRequestQueue: true,
            },
        });

        const instance = new WalletConnectHelper(walletKit);

        try {
            const clientId =
                await walletKit.engine.signClient.core.crypto.getClientId();
            console.log('WalletConnect ClientID: ', clientId);
            localStorage.setItem('WALLETCONNECT_CLIENT_ID', clientId);
        } catch (error) {
            console.error(
                'Failed to set WalletConnect clientId in localStorage: ',
                error
            );
        }

        walletKit.on('session_proposal', (args) => instance.onSessionProposal(args));
        walletKit.on('session_request', (args) => instance.onSessionRequest(args));
        walletKit.engine.signClient.events.on(
            'session_ping',
            (data) =>
                console.log('ping', data)
        );
        walletKit.on('session_delete', data => {
            console.log('session_delete event received', data)
        })
        walletKit.on('session_authenticate', (args) => instance.onSessionAuthenticate(args));

        return new WalletConnectHelper(walletKit);
    }

    async onSessionProposal(
        proposal: SignClientTypes.EventArguments['session_proposal']
    ) {
        console.log('{{{{{{{ onSessionProposal', proposal);

        //   console.log('session_proposal', proposal);
        //   // set the verify context so it can be displayed in the projectInfoCard
        //   SettingsStore.setCurrentRequestVerifyContext(proposal.verifyContext);
        //   ModalStore.open('SessionProposalModal', { proposal });

        const supportedNamespaces = await getSupportedNamespaces({
            secp256k1:
                '0x041de5aa83db3070f0ceb4d482042193ea945b29cf18362fa94155fc97b6eb1b3cf4dbe8d88f3b5aac8b7fd53c061e2c374f1d4eb392cbe56205952e8f712bbd55',
        });
        console.log(
            'supportedNamespaces',
            JSON.stringify(supportedNamespaces, null, 2)
        );
        const approvedNamespaces = buildApprovedNamespaces({
            proposal: proposal.params,
            supportedNamespaces,
        });

        console.log(
            'approvedNamespaces',
            JSON.stringify(approvedNamespaces, null, 2)
        );

        await this.walletKit.approveSession({
            id: proposal.id,
            namespaces: approvedNamespaces,
        });

        console.log('getActiveSessions', JSON.stringify(this.walletKit.getActiveSessions(), null, 4));
        console.warn(3)
    }

    async onSessionRequest(
        requestEvent: SignClientTypes.EventArguments['session_request']
    ) {
        console.log('{{{{{{{ onSessionRequest', requestEvent);
        //   const { topic, params, verifyContext, id } = requestEvent;
        //   const { request } = params;
        //   const requestSession = walletkit.engine.signClient.session.get(topic);
        //   // set the verify context so it can be displayed in the projectInfoCard
        //   SettingsStore.setCurrentRequestVerifyContext(verifyContext);
        //   switch (request.method) {
        //     case EIP155_SIGNING_METHODS.ETH_SIGN:
        //     case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
        //       return ModalStore.open('SessionSignModal', {
        //         requestEvent,
        //         requestSession,
        //       });

        //     case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
        //     case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
        //     case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
        //       return ModalStore.open('SessionSignTypedDataModal', {
        //         requestEvent,
        //         requestSession,
        //       });

        //     case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
        //     case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION:
        //       return ModalStore.open('SessionSendTransactionModal', {
        //         requestEvent,
        //         requestSession,
        //       });

        //     case EIP7715_METHOD.WALLET_GRANT_PERMISSIONS: {
        //       return ModalStore.open('SessionGrantPermissionsModal', {
        //         requestEvent,
        //         requestSession,
        //       });
        //     }

        //     case EIP5792_METHODS.WALLET_GET_CAPABILITIES:
        //     case EIP5792_METHODS.WALLET_GET_CALLS_STATUS:
        //       return await walletkit.respondSessionRequest({
        //         topic,
        //         response: await approveEIP5792Request(requestEvent),
        //       });

        //     case EIP5792_METHODS.WALLET_SHOW_CALLS_STATUS:
        //       return await walletkit.respondSessionRequest({
        //         topic,
        //         response: formatJsonRpcError(
        //           id,
        //           "Wallet currently don't show call status."
        //         ),
        //       });

        //     case EIP5792_METHODS.WALLET_SEND_CALLS: {
        //       const wallet = await getWallet(params);
        //       if (wallet instanceof EIP155Lib) {
        //         /**
        //          * Not Supporting for batch calls on EOA for now.
        //          * if EOA, we can submit call one by one, but need to have a data structure
        //          * to return bundle id, for all the calls,
        //          */
        //         return await walletkit.respondSessionRequest({
        //           topic,
        //           response: formatJsonRpcError(
        //             id,
        //             "Wallet currently don't support batch call for EOA"
        //           ),
        //         });
        //       }
        //       return ModalStore.open('SessionSendCallsModal', {
        //         requestEvent,
        //         requestSession,
        //       });
        //     }

        //     case COSMOS_SIGNING_METHODS.COSMOS_SIGN_DIRECT:
        //     case COSMOS_SIGNING_METHODS.COSMOS_SIGN_AMINO:
        //       return ModalStore.open('SessionSignCosmosModal', {
        //         requestEvent,
        //         requestSession,
        //       });

        //     case SOLANA_SIGNING_METHODS.SOLANA_SIGN_MESSAGE:
        //     case SOLANA_SIGNING_METHODS.SOLANA_SIGN_TRANSACTION:
        //     case SOLANA_SIGNING_METHODS.SOLANA_SIGN_AND_SEND_TRANSACTION:
        //     case SOLANA_SIGNING_METHODS.SOLANA_SIGN_ALL_TRANSACTIONS:
        //       return ModalStore.open('SessionSignSolanaModal', {
        //         requestEvent,
        //         requestSession,
        //       });

        //     case POLKADOT_SIGNING_METHODS.POLKADOT_SIGN_MESSAGE:
        //     case POLKADOT_SIGNING_METHODS.POLKADOT_SIGN_TRANSACTION:
        //       return ModalStore.open('SessionSignPolkadotModal', {
        //         requestEvent,
        //         requestSession,
        //       });

        //     case NEAR_SIGNING_METHODS.NEAR_SIGN_IN:
        //     case NEAR_SIGNING_METHODS.NEAR_SIGN_OUT:
        //     case NEAR_SIGNING_METHODS.NEAR_SIGN_TRANSACTION:
        //     case NEAR_SIGNING_METHODS.NEAR_SIGN_AND_SEND_TRANSACTION:
        //     case NEAR_SIGNING_METHODS.NEAR_SIGN_TRANSACTIONS:
        //     case NEAR_SIGNING_METHODS.NEAR_SIGN_AND_SEND_TRANSACTIONS:
        //     case NEAR_SIGNING_METHODS.NEAR_VERIFY_OWNER:
        //     case NEAR_SIGNING_METHODS.NEAR_SIGN_MESSAGE:
        //       return ModalStore.open('SessionSignNearModal', {
        //         requestEvent,
        //         requestSession,
        //       });

        //     case MULTIVERSX_SIGNING_METHODS.MULTIVERSX_SIGN_MESSAGE:
        //     case MULTIVERSX_SIGNING_METHODS.MULTIVERSX_SIGN_TRANSACTION:
        //     case MULTIVERSX_SIGNING_METHODS.MULTIVERSX_SIGN_TRANSACTIONS:
        //     case MULTIVERSX_SIGNING_METHODS.MULTIVERSX_SIGN_LOGIN_TOKEN:
        //     case MULTIVERSX_SIGNING_METHODS.MULTIVERSX_SIGN_NATIVE_AUTH_TOKEN:
        //       return ModalStore.open('SessionSignMultiversxModal', {
        //         requestEvent,
        //         requestSession,
        //       });

        //     case NEAR_SIGNING_METHODS.NEAR_GET_ACCOUNTS:
        //       return walletkit.respondSessionRequest({
        //         topic,
        //         response: await approveNearRequest(requestEvent),
        //       });

        //     case TRON_SIGNING_METHODS.TRON_SIGN_MESSAGE:
        //     case TRON_SIGNING_METHODS.TRON_SIGN_TRANSACTION:
        //       return ModalStore.open('SessionSignTronModal', {
        //         requestEvent,
        //         requestSession,
        //       });
        //     case TEZOS_SIGNING_METHODS.TEZOS_GET_ACCOUNTS:
        //     case TEZOS_SIGNING_METHODS.TEZOS_SEND:
        //     case TEZOS_SIGNING_METHODS.TEZOS_SIGN:
        //       return ModalStore.open('SessionSignTezosModal', {
        //         requestEvent,
        //         requestSession,
        //       });
        //     case KADENA_SIGNING_METHODS.KADENA_GET_ACCOUNTS:
        //     case KADENA_SIGNING_METHODS.KADENA_SIGN:
        //     case KADENA_SIGNING_METHODS.KADENA_QUICKSIGN:
        //       return ModalStore.open('SessionSignKadenaModal', {
        //         requestEvent,
        //         requestSession,
        //       });
        //     case BIP122_SIGNING_METHODS.BIP122_SIGN_MESSAGE:
        //       return ModalStore.open('SessionSignBip122Modal', {
        //         requestEvent,
        //         requestSession,
        //       });
        //     case BIP122_SIGNING_METHODS.BIP122_GET_ACCOUNT_ADDRESSES:
        //       return ModalStore.open('SessionGetBip122AddressesModal', {
        //         requestEvent,
        //         requestSession,
        //       });
        //     case BIP122_SIGNING_METHODS.BIP122_SIGN_PSBT:
        //     case BIP122_SIGNING_METHODS.BIP122_SEND_TRANSACTION:
        //       return ModalStore.open('SessionSendTransactionBip122Modal', {
        //         requestEvent,
        //         requestSession,
        //       });
        //     default:
        //       return ModalStore.open('SessionUnsuportedMethodModal', {
        //         requestEvent,
        //         requestSession,
        //       });
        //   }
    }

    async onSessionAuthenticate(
        authRequest: SignClientTypes.EventArguments['session_authenticate']
    ) {
        console.log('{{{{{{{ onSessionAuthenticate', authRequest);
        //   ModalStore.open('SessionAuthenticateModal', { authRequest });
    }

    getPairings() {
        return this.walletKit.core.pairing.getPairings();
    }

    async connect(uri: string) {
        const { topic: pairingTopic } = parseUri(uri);
        // if for some reason, the proposal is not received, we need to close the modal when the pairing expires (5mins)
        const pairingExpiredListener = ({ topic }) => {
            if (pairingTopic === topic) {
                //TODO: error message 'Pairing expired. Please try again with new Connection URI'
                this.walletKit.core.pairing.events.removeListener(
                    'pairing_expire',
                    pairingExpiredListener
                );
            }
        };

        this.walletKit.once('session_proposal', () => {
            this.walletKit.core.pairing.events.removeListener(
                'pairing_expire',
                pairingExpiredListener
            );
        });

        this.walletKit.core.pairing.events.on(
            'pairing_expire',
            pairingExpiredListener
        );
        return this.walletKit.pair({ uri });
    }

    async disconnectSession(topic: string) {
        return this.walletKit.disconnectSession({ topic, reason: getSdkError('USER_DISCONNECTED') });
    }
}