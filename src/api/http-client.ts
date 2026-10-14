import { z } from "zod";
import { UniError } from "./errors";


///////////////////////////////////////////////////////////////////////////////
const DEFAULT_TIMEOUT = 10 * 1000;
const DEFAULT_VALIDATE_STATUS = (status: number)=> status >= 200 && status < 300;


///////////////////////////////////////////////////////////////////////////////
export class HttpClient {

    readonly baseUrl: URL;
    private readonly _timeout: number;

    constructor(args: {
        baseUrl: string | URL,
        timeout?: number,
    }) {
        this.baseUrl = new URL(args.baseUrl, globalThis.window?.location?.origin ?? "http://localhost");
        this._timeout = args.timeout ?? DEFAULT_TIMEOUT;
    }

    async getTyped<SchemaType extends z.ZodType>(args: {
        schema: SchemaType,
        url?: string,
        params?: Record<string, string>,
        headers?: Record<string, string>,
    }): Promise<z.infer<SchemaType>> {
        const params = new URLSearchParams(args.params ?? {});
        const url = `${args.url ?? ""}?${params.toString()}`;

        const response = await this.fetch({
            url,
            headers: {
                "Accept": "application/json",
                ...(args.headers ?? {}),
            },
        });

        return HttpClient.parseTypedResponse({ response, schema: args.schema });
    }

    async postTyped<SchemaType extends z.ZodType>(args: {
        schema: SchemaType,
        body: any,
        url?: string,
        params?: Record<string, string>,
        headers?: Record<string, string>,
    }): Promise<z.infer<SchemaType>> {
        const params = new URLSearchParams(args.params ?? {});
        const url = `${args.url ?? ""}?${params.toString()}`;

        const response = await this.fetch({
            url,
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                ...(args.headers ?? {}),
            },
            body: JSON.stringify(args.body),
        });

        return HttpClient.parseTypedResponse({ response, schema: args.schema });
    }

    async fetch(args: {
        url: string,
        method?: string,
        headers?: Record<string, string>,
        body?: string,
        validateStatus?: (status: number) => boolean,
    }): Promise<Response> {
        const validateStatus = args.validateStatus ?? DEFAULT_VALIDATE_STATUS;

        const controller = new AbortController();
        let aborted = false;

        const timeoutId = setTimeout(() => {
            controller.abort();
            aborted = true;
        }, this._timeout);

        let response: Response;
        try {
            const mergedUrl = new URL(args.url, this.baseUrl);
            for( const [name, value] of this.baseUrl.searchParams.entries() ) {
                mergedUrl.searchParams.set(name, value);
            }

            response = await fetch(mergedUrl, {
                method: args.method,
                body: args.body,
                headers: args.headers,
                signal: controller.signal,
            });
        } 
        catch(err) {
            if( aborted ) {
                throw new UniError("SERVER_ERROR", "Request timed out");
            } else {
                throw new UniError("NETWORK_ERROR", `Network error : ${err}`);
            }
        } 
        finally {
            clearTimeout(timeoutId);
        }

        if( !validateStatus(response.status) ) {
            throw new UniError("SERVER_ERROR", `Request failed : status=${response.status}`);
        }

        return response;
    }

    static async parseTypedResponse<SchemaType extends z.ZodType>(args: {
        response: Response,
        schema: SchemaType,
    }): Promise<z.infer<SchemaType>> {
        try {
            const jsData = await args.response.json();
            return await args.schema.parseAsync(jsData);
        } catch(err) {
            throw new UniError("SERVER_ERROR", "Invalid server response");
        }
    }
}
