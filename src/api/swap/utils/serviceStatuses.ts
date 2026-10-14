import { SWAP_HISTORY_STATUSES } from "../../constants-types";
// bridgers statuses
const BridgersOmniPendingStatuses = [
  "wait_deposit_send",
  "wait_exchange_push",
  "wait_exchange_return",
  "wait_exchange_return_success",
  "wait_receive_confirm",
  "wait_receive_send",
  "wait_enough_send",
];

const BridgersOmniFailedStatuses = [
  "timeout",
  "wait_deposit_send_fail",
  "refund_complete",
];

const BridgersOmniSuccessStatuses = ["receive_complete"];

// changelly statuses
const ChangellyPendingStatuses = ["waiting", "exchanging", "sending"];

const ChangellyFailedStatuses = ["failed"];

const ChangellySuccessStatuses = ["finished", "confirmed"];

const ChangellyHoldStatuses = ["hold"];

// One Inch statuses

const OneInchPendingStatuses = ["pending", "0"];

const OneInchFailedStatuses = ["failed", "expired", "301"];

const OneInchSuccessStatuses = ["completed", "filled", "200"];

const OneInchCrossPendingStatuses = ["pending"];

const OneInchCrossFailedStatuses = ["failed"];

const OneInchCrossSuccessStatuses = ["executed"];
const AllPendingStatuses = [
  ...BridgersOmniPendingStatuses,
  ...ChangellyPendingStatuses,
  ...OneInchPendingStatuses,
  ...OneInchCrossPendingStatuses,
];
const AllFailedStatuses = [
  ...BridgersOmniFailedStatuses,
  ...ChangellyFailedStatuses,
  ...OneInchFailedStatuses,
  ...OneInchCrossFailedStatuses,
];
const AllSuccessStatuses = [
  ...BridgersOmniSuccessStatuses,
  ...ChangellySuccessStatuses,
  ...OneInchSuccessStatuses,
  ...OneInchCrossSuccessStatuses,
];
const AllHoldStatuses: string[] = [...ChangellyHoldStatuses];

const statusMap: Record<
  string,
  (typeof SWAP_HISTORY_STATUSES)[keyof typeof SWAP_HISTORY_STATUSES]
> = {};

AllPendingStatuses.forEach(
  (status) => (statusMap[status] = SWAP_HISTORY_STATUSES.PENDING)
);
AllFailedStatuses.forEach(
  (status) => (statusMap[status] = SWAP_HISTORY_STATUSES.FAILED)
);
AllSuccessStatuses.forEach(
  (status) => (statusMap[status] = SWAP_HISTORY_STATUSES.SUCCESS)
);
AllHoldStatuses.forEach(
  (status) => (statusMap[status] = SWAP_HISTORY_STATUSES.HOLD)
);

export const getHistoryStatus = (serviceStatus: string): string => {
  return statusMap[serviceStatus.trim()] ?? serviceStatus;
};
