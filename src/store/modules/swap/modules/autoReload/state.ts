export interface AutoReloadState {
  autoReloadId: number | undefined;
  secondsLeft: number;
}

export const state: AutoReloadState = {
  autoReloadId: undefined,
  secondsLeft: 0,
};
