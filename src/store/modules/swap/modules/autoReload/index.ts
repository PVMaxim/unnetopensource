import { Module } from "vuex/types/index.js";
import { mutations } from "./mutations";
import { state, AutoReloadState } from "./state";
import { actions } from "./actions";

export const autoReload: Module<AutoReloadState, any> = {
  namespaced: true,
  state,
  mutations,
  actions,
};
