import { ethers } from "ethers";
import { UniError } from "../errors";


///////////////////////////////////////////////////////////////////////////////
export function convertEthersError(error: unknown): Error {
    // todo
    return new UniError("INTERNAL_ERROR", `${error}`);
}


///////////////////////////////////////////////////////////////////////////////
export async function wrapEthersErrors<T>(
    fn: () => Promise<T>
): Promise<T> {
    try {
        return await fn();
    } catch(error: unknown) {
        throw convertEthersError(error);
    }
}
