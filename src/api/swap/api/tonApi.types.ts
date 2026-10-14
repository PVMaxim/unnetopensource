export interface TonApiTransactionWithTrace extends TonApiTransaction {
  children: TonApiTransactionWithTrace[];
  transaction: TonApiTransaction;
  emulated: boolean;
  interface: string[];
}

interface DedustSwapOutBody {
  asset_in: DedustAsset;
  asset_out: DedustAsset;
  amount_in: string; // nano units (jetton or TON)
  amount_out: string; // nano units
  field4: {
    sender_addr: string;
    referral_addr: string;
    reserve0: string;
    reserve1: string;
  };
  forward_payload?: {
    is_right: boolean;
    value: Record<string, unknown>;
  };
}

interface DedustAsset {
  sum_type: "Jetton" | "Native";
  native: Record<string, never>;
  jetton: {
    workchain_id: number;
    address: string;
  };
  extra_currency: {
    currency_id: number;
  };
}

/* ===================== TRANSACTION ===================== */

export interface TonApiTransaction {
  hash: string;
  lt: number;
  account: Account;
  success: boolean;
  utime: number;
  orig_status: string;
  end_status: string;
  total_fees: number;
  end_balance: number;
  transaction_type: string;

  state_update_old: string;
  state_update_new: string;

  in_msg: InMessage | null;
  out_msgs: OutMessage[];

  block: string;
  prev_trans_hash?: string;
  prev_trans_lt?: number;

  compute_phase?: ComputePhase;
  storage_phase?: StoragePhase;
  credit_phase?: CreditPhase;
  action_phase?: ActionPhase;

  aborted: boolean;
  destroyed: boolean;
  raw: string;
}

/* ===================== ACCOUNT ===================== */

interface Account {
  address: string;
  is_scam: boolean;
  is_wallet: boolean;
}

interface AddressInfo {
  address: string;
  is_scam: boolean;
  is_wallet: boolean;
}

/* ===================== MESSAGES ===================== */

type MessageType = "int_msg" | "ext_in_msg";

interface BaseMessage {
  msg_type: MessageType;
  created_lt: number;
  ihr_disabled: boolean;
  bounce: boolean;
  bounced: boolean;
  value: number;
  fwd_fee: number;
  ihr_fee: number;
  import_fee: number;
  created_at: number;
  hash: string;
  decoded_body?: DecodedBody | DedustSwapOutBody;
}

/* ---------- IN MSG ---------- */

type InMessage = InternalInMessage | ExternalInMessage;

interface InternalInMessage extends BaseMessage {
  msg_type: "int_msg";
  destination: AddressInfo;
  source: AddressInfo;
}

interface ExternalInMessage extends BaseMessage {
  msg_type: "ext_in_msg";
  destination: AddressInfo;

  op_code?: string;
  raw_body?: string;
  decoded_op_name?: "jetton_notify" | "wallet_signed_v3";
  decoded_body?: DecodedBody;
}

/* ---------- OUT MSG ---------- */

interface OutMessage extends BaseMessage {
  msg_type: "int_msg";
  destination: AddressInfo;
  source: AddressInfo;
}

/* ===================== DECODED ===================== */

type DecodedBody = JettonNotifyBody | WalletSignedV3Body;

/* ---------- JETTON ---------- */

interface JettonNotifyBody {
  query_id: number;
  amount: string;
  sender: string;
  forward_payload: {
    is_right: boolean;
    value: Record<string, unknown>;
  };
}

/* ---------- WALLET SIGNED V3 ---------- */

interface WalletSignedV3Body {
  signature: string;
  subwallet_id: number;
  valid_until: number;
  seqno: number;
  payload: WalletPayloadItem[];
  forward_payload?: {
    is_right: boolean;
    value: Record<string, unknown>;
  };
}

interface WalletPayloadItem {
  mode: number;
  message: WalletMessage;
}

interface WalletMessage {
  sum_type: "MessageInternal";
  message_internal: MessageInternal;
}

interface MessageInternal {
  ihr_disabled: boolean;
  bounce: boolean;
  bounced: boolean;
  src: string;
  dest: string;
  value: {
    grams: string;
    other: Record<string, unknown>;
  };
  ihr_fee: string;
  fwd_fee: string;
  created_lt: number;
  created_at: number;
  init: null;
  body: {
    is_right: boolean;
    value: Record<string, unknown>;
  };
}

/* ===================== PHASES ===================== */

interface ComputePhase {
  skipped: boolean;
  success: boolean;
  gas_fees: number;
  gas_used: number;
  vm_steps: number;
  exit_code: number;
  exit_code_description: string;
}

interface StoragePhase {
  fees_collected: number;
  status_change: string;
}

interface CreditPhase {
  fees_collected: number;
  credit: number;
}

interface ActionPhase {
  success: boolean;
  result_code: number;
  total_actions: number;
  skipped_actions: number;
  fwd_fees: number;
  total_fees: number;
}
