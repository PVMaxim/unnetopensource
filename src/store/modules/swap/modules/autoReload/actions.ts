import { Commit, Dispatch } from "vuex/types/index.js";
import { AutoReloadMutationTypes } from "./mutations";
import { AUTO_RELOAD_INTERVAL, AUTO_RELOAD_STEP } from "./constants";
import { AutoReloadState } from "./state";

export const actions = {
  startAutoReload({
    commit,
    dispatch,
    state,
  }: {
    commit: Commit;
    dispatch: Dispatch;
    state: AutoReloadState;
  }) {
    clearInterval(state.autoReloadId);
    commit(
      AutoReloadMutationTypes.SET_SWAP_AUTO_RELOAD_SECONDS_LEFT,
      AUTO_RELOAD_INTERVAL
    );
    commit(
      AutoReloadMutationTypes.SET_SWAP_AUTO_RELOAD_ID,
      setInterval(() => {
        if (state.secondsLeft > 0) {
          commit(
            AutoReloadMutationTypes.SET_SWAP_AUTO_RELOAD_SECONDS_LEFT,
            state.secondsLeft - 1
          );
        } else {
          dispatch("swap/getQuote", null, { root: true });
          clearInterval(state.autoReloadId);
          commit(AutoReloadMutationTypes.CLEAR_SWAP_AUTO_RELOAD_ID);
        }
      }, AUTO_RELOAD_STEP)
    );
  },
  stopAutoReload({
    commit,
    state,
  }: {
    commit: Commit;
    state: AutoReloadState;
  }) {
    if (state.autoReloadId) {
      commit(AutoReloadMutationTypes.SET_SWAP_AUTO_RELOAD_SECONDS_LEFT, 0);
      clearInterval(state.autoReloadId);
      commit(AutoReloadMutationTypes.CLEAR_SWAP_AUTO_RELOAD_ID);
    }
  },
};
