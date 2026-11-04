import { createStore } from 'vuex';
import lang from './modules/lang';
import user from './modules/user';
import settings from './modules/settings';
import swap from './modules/swap';
import swapHistory from './modules/swapHistory';

export const store = createStore({
  modules: {
    lang,
    user,
    settings,
    swap,
    swapHistory,
  },
  strict: false,
  plugins: []
})

export default store;