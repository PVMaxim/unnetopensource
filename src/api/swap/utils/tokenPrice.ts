import { SwapPriceProvider } from "./priceProvider";
import { SwapToken } from "../types";
import BigNumber from "bignumber.js";

const swapPriceProvider = new SwapPriceProvider();

export const getTokenPrice = async (token: SwapToken, amount: string) => {
    try {
        let price = "0";
        const priceFromProvider = await swapPriceProvider.getPrice(token);
        if (priceFromProvider) {
            price = priceFromProvider;
        }

        const pBN = new BigNumber(price);
        const aBN = new BigNumber(amount);
        if (pBN.isNaN() || aBN.isNaN()) {
           return "0";
        }

        const priceInUSD = pBN.multipliedBy(aBN);
        const priceInUSDString = priceInUSD.toString();

        const res = (`${priceInUSDString}`.match(new RegExp(`^-?\\d+(?:\.\\d{0,${2}})?`)) as string[])[0];

        return  res;
    } catch (error) {
        throw error;
    }

}