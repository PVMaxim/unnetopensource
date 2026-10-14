import { z } from "zod";
import { UniError } from "../errors";
import { HttpClient } from "../http-client";


///////////////////////////////////////////////////////////////////////////////
const AuthResponseSchema = z.object({
    access_token: z.string(),
    token_type: z.literal("Bearer"),
});

const PrepareResponseSchema = z.object({
    hash: z.string(),
});

const ExecuteResponseSchema = z.object({
    status: z.enum(["progress", "finished"]),
});


///////////////////////////////////////////////////////////////////////////////
export class CantonAuthClient {

    private readonly ONBOARDING_MAX_TRIES = 30;
    private readonly ONBOARDING_INTERVAL_MS = 2000;

    private readonly _http: HttpClient;

    constructor(baseUrl: string) {
        this._http = new HttpClient({ baseUrl });
    }

    async getToken(publicKey: string): Promise<string> {
        const response = await this._http.postTyped({
            schema: AuthResponseSchema,
            url: "/token",
            body: {
                client_id: publicKey,
                grant_type: "client_credentials",
            },
        });

        return response.access_token;
    }

    async prepareOnboarding(publicKey: string) {
        return this._http.postTyped({
            schema: PrepareResponseSchema,
            url: "/onboarding/prepare",
            body: {
                public_key: publicKey,
            },
        });
    }

    async executeOnboarding(args: {
        publicKey: string,
        signature: string,
    }) {
        let tries = 0;

        while( tries < this.ONBOARDING_MAX_TRIES ) {
            const response = await this._http.postTyped({
                schema: ExecuteResponseSchema,
                url: "/onboarding/execute",
                body: {
                    public_key: args.publicKey,
                    signature: args.signature,
                },
            });

            if( response.status === "finished" ) {
                return;
            }

            await new Promise((resolve) => setTimeout(resolve, this.ONBOARDING_INTERVAL_MS));
            tries++;
        }

        throw new UniError("SERVER_ERROR", "Request timed out");
    }
}
