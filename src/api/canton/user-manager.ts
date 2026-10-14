import { CardKeys, Request } from "../common";
import { assertArgument } from "../errors";
import { HttpClient } from "../http-client";
import { Ed25519RequestChunk } from "../request-chunks";
import { CantonAuthClient } from "./auth-client";
import { getEd25519Key } from "../utils";


///////////////////////////////////////////////////////////////////////////////
class CantonOnboardingRequest implements Request {
    readonly actionType = "CREATE_USER";
    readonly chunks: Ed25519RequestChunk[];

    constructor(readonly ctrArgs: {
        authClient: CantonAuthClient,
        hash: string,
        publicKey: string,
    }) {
        this.chunks = [
            new Ed25519RequestChunk({
                hash: ctrArgs.hash,
                expectedPublicKey: ctrArgs.publicKey,
            }),
        ];
    }

    async estimateFee(): Promise<string> {
        return "0";
    }

    async send(): Promise<string> {
        const signature = this.chunks[0].signature;
        assertArgument(!!signature, "Request is not signed");

        await this.ctrArgs.authClient.executeOnboarding({
            publicKey: this.ctrArgs.publicKey,
            signature,
        });

        return this.ctrArgs.hash;
    }
}


///////////////////////////////////////////////////////////////////////////////
export class CantonUserManager {

    private readonly _authClient: CantonAuthClient;
    private readonly _ledgerClient: HttpClient;
    private readonly _knownUsers: Set<string>;

    constructor(args: {
        authServerUrl: string,
        ledgerUrl: string,
    }) {
        this._authClient = new CantonAuthClient(args.authServerUrl);
        this._ledgerClient = new HttpClient({ baseUrl: args.ledgerUrl });
        this._knownUsers = new Set();
    }

    getAuthToken(keys: CardKeys): Promise<string> {
        return this._authClient.getToken(getEd25519Key(keys));
    }

    async userExists(keys: CardKeys): Promise<boolean> {
        const cardPublicKey = getEd25519Key(keys);

        if( this._knownUsers.has(cardPublicKey) ) {
            return true;
        }

        const userExists = await this._userExists(cardPublicKey);
        if( userExists ) {
            this._knownUsers.add(cardPublicKey);
        }

        return userExists;
    }

    private async _userExists(cardPublicKey: string): Promise<boolean> {
        try {
            const token = await this._authClient.getToken(cardPublicKey);

            const response = await this._ledgerClient.fetch({
                url: "/v2/authenticated-user",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                validateStatus: x => x === 200 || x === 401 || x === 403 || x === 404,
            });

            return response.status === 200;
        } catch (err) {
            return false;
        }
    }

    async performOnboarding(keys: CardKeys) {
        const publicKey = getEd25519Key(keys);
        const prepared = await this._authClient.prepareOnboarding(publicKey);

        return new CantonOnboardingRequest({
            authClient: this._authClient,
            hash: prepared.hash,
            publicKey,
        });
    }
}
