import { Address } from "everscale-inpage-provider";


///////////////////////////////////////////////////////////////////////////////
export const ZERO_ADDRESS = new Address("0:0000000000000000000000000000000000000000000000000000000000000000");

// native coin
export const VENOM_NATIVE_COIN_DECIMALS = 9;

// deployer
export const WALLET_DEPLOYMENT_TIMEOUT  = 60;           // seconds
export const TRANSACTION_LIFE_TIME      = 3 * 60;       // seconds
export const DEPLOYER_MIN_BALANCE       = 0.01;         // VENOM

// tip3
export const TIP3_TRANSFER_COST         = "100000000";  // 0.1 VENOM
export const TIP3_DEPLOY_WALLET_COST    = "100000000";  // 0.1 VENOM

export const TX_COLLECTOR_CHUNK_SIZE    = 5;
export const TRANSACTION_WAIT_TIMEOUT   = 60;   // seconds
export const TRANSACTION_WAIT_DELAY     = 5;    // seconds
