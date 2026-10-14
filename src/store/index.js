import { createStore, createLogger } from 'vuex';
import lang from './modules/lang';
import user from './modules/user';
import settings from './modules/settings';
import swap from './modules/swap';
import swapHistory from './modules/swapHistory';

const debug = process.env.NODE_ENV !== 'production'

export const store = createStore({
  modules: {
    lang,
    user,
    settings,
    swap,
    swapHistory,
  },
  strict: debug,
  plugins: debug ? [createLogger()] : []
})

export default store;