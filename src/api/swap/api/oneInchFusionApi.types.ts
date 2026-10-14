export interface GetQuoteParamsV2 {
  enableEstimate: boolean;
  fee: string;
  walletAddress: string;
  amount: string;
  toTokenAddress: string;
  fromTokenAddress: string;
  chain: number;
  source: string;
}

export interface GetQuoteParamsV1 {
  enableEstimate: boolean;
  fee: string;
  wallet: string;
  amount: string;
  dstToken: string;
  srcToken: string;
  chain: number;
}

interface Order {
  salt: string;
  makerAsset: string;
  takerAsset: string;
  maker: string;
  receiver: string;
  makingAmount: string;
  takingAmount: string;
  makerTraits: string;
}

export interface OrderWithSignature {
  order: Order;
  signature: string;
  extension: string;
  quoteId: string;
  chain: number;
}

export interface OrderItemWithMetaV2 {
  meta: Meta;
  items: OrderItemV2[];
}

export interface OrderItemWithMetaV1 {
  meta: Meta;
  items: OrderItemV1[];
}

interface Meta {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
}

export interface OrderItemV2 {
  orderHash: string;
  makerAsset: string;
  takerAsset: string;
  makerAmount: string;
  minTakerAmount: string;
  createdAt: string;
  version: string;
  fills: Fill[];
  approximateTakingAmount: string;
  status: string;
  cancelTx: string | null;
  isNativeCurrency: boolean;
  auctionStartDate: number;
  auctionDuration: number;
  initialRateBump: number;
  points: unknown | null;
  receiver: string;
  makerTraits: string;
  positiveSurplus: string;
  maker: string;
  order: OrderInfo;
  cancelable: boolean;
  chainId: number;
}

interface Fill {
  txHash: string;
  filledMakerAmount: string;
  filledAuctionTakerAmount: string;
  takerFeeAmount: string;
}

interface OrderInfo {
  salt: string;
  maker: string;
  receiver: string;
  makerAsset: string;
  takerAsset: string;
  makerTraits: string;
  makingAmount: string;
  takingAmount: string;
}

export interface QuoteResponseV1 {
  quoteId?: string;
  srcAmount: string;
  dstAmount: string;
  presets: Presets;
  recommendedPreset: "fast" | "medium" | "slow";
  prices: Prices;
  volume: Volume;
  priceImpactPercent: number;
  autoK: number;
  k: number;
  mxK: number;
}

interface Presets {
  fast: PresetItem;
  medium: PresetItem;
  slow: PresetItem;
}

interface PresetItem {
  startAuctionIn: number;
  auctionDuration: number;
  initialRateBump: number;
  auctionStartAmount: string;
  auctionEndAmount: string;
  costInDstToken: string;
  points: PresetPoint[];
}

interface PresetPoint {
  delay: number;
  coefficient: number;
}

interface Prices {
  usd: TokenPrice;
}

interface TokenPrice {
  srcToken: string;
  dstToken: string;
}

interface Volume {
  usd: TokenVolume;
}

interface TokenVolume {
  srcToken: string;
  dstToken: string;
}

interface Fill {
  filledMakerAmount: string;
  filledAuctionTakerAmount: string;
  txSignature: string;
}

interface Fee {
  protocolFee: number;
  integratorFee: number;
  surplusPercentage: number;
  protocolDstAta: string | null;
  integratorDstAta: string | null;
  maxCancellationPremium: string;
}

interface DutchAuctionPoint {
  rateBump: number;
  timeDelta: number;
}

interface DutchAuctionData {
  startTime: number;
  duration: number;
  initialRateBump: number;
  pointsAndTimeDeltas: DutchAuctionPoint[];
}

interface Order {
  id: number;
  srcAmount: string;
  minDstAmount: string;
  estimatedDstAmount: string;
  expirationTime: number;
  receiver: string;
  srcAssetIsNative: boolean;
  dstAssetIsNative: boolean;
  cancellationAuctionDuration: number;
  fee: Fee;
  dutchAuctionData: DutchAuctionData;
  srcMint: string;
  dstMint: string;
}

export interface OrderItemV1 {
  orderHash: string;
  maker: string;
  expirationTime: number;
  createdAt: number;
  fills: Fill[];
  approximateTakingAmount: string;
  status: number;
  cancelTx: string | null;
  order: Order;
  cancelable: boolean;
}
