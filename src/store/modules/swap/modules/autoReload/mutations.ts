import { AutoReloadState } from "./state";

export enum AutoReloadMutationTypes {
  SET_SWAP_AUTO_RELOAD_ID = "SET_SWAP_AUTO_RELOAD_ID",
  CLEAR_SWAP_AUTO_RELOAD_ID = "CLEAR_SWAP_AUTO_RELOAD_ID",
  SET_SWAP_AUTO_RELOAD_SECONDS_LEFT = "SET_SWAP_AUTO_RELOAD_SECONDS_LEFT",
}

export type Mutations<S = AutoReloadState> = {
  [AutoReloadMutationTypes.SET_SWAP_AUTO_RELOAD_ID](
    state: S,
    payload: number | undefined
  ): void;
  [AutoReloadMutationTypes.CLEAR_SWAP_AUTO_RELOAD_ID](state: S): void;
  [AutoReloadMutationTypes.SET_SWAP_AUTO_RELOAD_SECONDS_LEFT](
    state: S,
    payload: number
  ): void;
};

export const mutations: Mutations = {
  [AutoReloadMutationTypes.SET_SWAP_AUTO_RELOAD_ID](state, id) {
    state.autoReloadId = id;
  },
  [AutoReloadMutationTypes.CLEAR_SWAP_AUTO_RELOAD_ID](state) {
    state.autoReloadId = undefined;
  },
  [AutoReloadMutationTypes.SET_SWAP_AUTO_RELOAD_SECONDS_LEFT](state, seconds) {
    state.secondsLeft = seconds;
  },
};
