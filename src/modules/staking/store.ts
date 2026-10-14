import { ActionContext } from "vuex";
import { StakingService, StakingVault } from "./services/StakingService";

export interface StakingState {
  vaults: StakingVault[];
}

export const stakingStore = {
  namespaced: true,
  state: (): StakingState => ({
    vaults: []
  }),
  mutations: {
    SET_VAULTS(state: StakingState, vaults: StakingVault[]) {
      state.vaults = vaults;
    }
  },
  actions: {
    async loadVaults({ commit, dispatch, rootState }: ActionContext<StakingState, any>) {
      const activeChain = rootState.settings.rpcProvider?.name;
      if (!activeChain) {
        commit("SET_VAULTS", []);
        return;
      }
      
      const vaults = await StakingService.getVaults(activeChain);
      commit("SET_VAULTS", vaults);
      
      await dispatch("refreshBalances");
    },
    
    async refreshBalances({ commit, state }: ActionContext<StakingState, any>) {
      if (state.vaults.length === 0) return;
      try {
        const updatedVaults = await StakingService.updateVaultBalances(state.vaults);
        commit("SET_VAULTS", updatedVaults);
      } catch (e) {
        console.error("[StakingStore] Failed to update balances:", e);
      }
    }
  }
};

export default stakingStore;
