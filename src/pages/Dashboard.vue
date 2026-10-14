<template>
  <main>
    <div class="container-main" :class="[{falc: isLoading || error}]">
      <Loading v-if="isLoading" :messageLoad = messageLoad :titleLoad = titleLoad />
      <Panel  v-else-if="error"  
        :title="$t('errors.transferError')" 
        :subtitle=errorSubtitle
        :iconUrl=errorImg
        :buttonClick=errorHandler
        :buttonName="$t('button.confirm')" />
      <div id="dashboard" class="container-box" v-else>
        <SendReceiveSwapPanel />
        <SendReceiveSwapTabs 
          :firstTab="firstTabName"
          :secondTab="secondTabName"
          v-model:activeTab=activeTab
        />
        <div v-if="activeTab === firstTabName" class="history-box">
          <div class="balance-sum text-gray">{{ $t('pages.dashboard.totalBalance') }} <span class="text-white">≈ ${{ roundNumber(tokensBalance ?? 0, 6) }}</span></div>
          <div ref="historyElement" class="history">
            <PullToRefresh :loading='loadingRefresh' @refresh='refreshHandler'>
            <SearchTokens
              ref="searchComponent"
              :placeholder="$t('pages.dashboard.searchPlaceholder')"
              @searchResults="searchTokensResult($event?.value)"
              @searchText="searchTokensText($event?.value)"
              v-model:errorSearch=errorSearch
            />
            <div v-if="searchTokensLength > 0" class="history-group search">
              <div class="history-title">{{searchTokens?.length}} {{ $t('pages.dashboard.results') }}</div>
              <SearchTokenList 
              :inputData="searchTokens"
              :errorSearch="errorSearch"
              :searchTokensLength="searchTokensLength"
              :minHeight=historyElementComp
              />
            </div>
            <div v-else class="history-group">
              <div class="history-title top-gap">{{ $t('pages.dashboard.yourBalances') }}</div>
                <DashboardList :minHeight=historyElementComp />
            </div>
          </PullToRefresh>
          </div>
        </div>
        <div v-if="activeTab === secondTabName" class="history-box" ref="historyBox">
          <div ref="historyElement" class="history all-transactions">
            <div class="history-title">{{ $t('pages.dashboard.historyColon') }} [{{ storeProvider?.name }}]</div>
              <ProviderTransactionList v-if="historyPageLimit"
                :historyPageLimit="historyPageLimit"
                :minHeight="minHeightComp"
              />
          </div>
        </div>
      </div>
    </div>
    <AlertConfirmModal 
      v-model="isShowConfirm"
      :title="$t('pages.dashboard.confirmAddTitle')"
      :token=tokenObject
      :buttonConfirmText="$t('button.confirm')"
      :buttonCancelText="$t('button.cancel')"
      @onConfirm="alertAddTokenConfirm($event.value)"
      @onCancel="alertAddTokenCancel($event.value)"
      :isShowCoingecko=true
      >
      <template #disclaimer>
        <div>{{ $t('pages.dashboard.disclaimer') }}</div>
      </template>
    </AlertConfirmModal>
  </main>
</template>

<script>
  import { ref, shallowRef, onMounted, computed, onErrorCaptured, watchEffect } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useStore } from 'vuex';
  import { useRouter } from 'vue-router';
  import { useEventsBus } from '@/plugins/eventBus.js';
  import { roundNumber, getErrorMessage, roundNumberIntMin } from '@/api/sub-utils';
  import Loading from '@/components/Loading.vue';
  import SendReceiveSwapPanel from '@/components/SendReceiveSwapPanel.vue';
  import SendReceiveSwapTabs from '@/components/SendReceiveSwapTabs.vue';
  import ProviderTransactionList from '@/components/ProviderTransactionList.vue';
  import SearchTokens from '@/components/SearchTokens.vue';
  import SearchTokenList from '@/components/SearchTokenList.vue';
  import DashboardList from '@/components/DashboardList.vue';
  import narrow from '@/components/svg/narrowRight.vue';
  import receiveButtonIcon from '@/components/svg/receiveButtonIcon.vue';
  import sendButtonIcon from '@/components/svg/sendButtonIcon.vue';
  import PullToRefresh from '@/components/PullToRefresh.vue';
  import { setTokensBalances } from '@/api/ApiHandler';
  import AlertConfirmModal from "@/components/AlertConfirmModal.vue";
  import Panel from '@/components/Panel.vue';

  export default {
    name: 'Dashboard page',
    layout: 'Dashboard',
    components: {
      Loading,
      SendReceiveSwapPanel,
      SendReceiveSwapTabs,
      DashboardList,
      ProviderTransactionList,
      SearchTokens,
      SearchTokenList,
      narrow,
      receiveButtonIcon,
      sendButtonIcon,
      PullToRefresh,
      AlertConfirmModal,
      Panel
    },
    setup() {
      const { t } = useI18n();
      const store = useStore()
      const isLoading = ref(false)
      const loadingRefresh = ref(false)
      const isReSearch = ref(false)
      const error = ref(false);
      const isShowConfirm = ref(false);
      const titleLoad = ref(t('pages.dashboard.status.wait'));
      const messageLoad = ref(t('pages.dashboard.status.gettingBalances'));
      const errorTitle = ref(t('errors.balanceError'));
      const errorSubtitle = ref(t('pages.send.pressOkToTryAgain'));
      const router = useRouter();
      const balance = ref(null);
      const tokenObject = ref(null);
      const page = ref(null);
      const errorSearch = ref(null);
      const searchTokens = shallowRef(null);
      const searchTokensLength = ref(0);
      const searchComponent = ref(SearchTokens);
      const activeTab = ref(null);
      const historyElement = ref(null);
      const firstTabName = computed(() => t('pages.dashboard.tokens'));
      const secondTabName = computed(() => t('pages.send.tabs.history'));
      const storeProvider = computed(() => { return store.state.settings.rpcProvider });
      const tokensBalance = computed(() => { return store.state.user.tokensData?.[store.state.settings.rpcProvider?.name]?.providerUSDBalance;});
      const historyElementComp = computed(() => { 
        console.log(`historyElementComp: ${historyElement.value?.clientHeight}`)
        if ( historyElement.value?.clientHeight ) {
          return `${Number((historyElement.value?.clientHeight - 108).toFixed())}px`;
        }
        return null;
      });
      const historyBox = ref(null);
      const historyPageLimit = computed(() => { 
        console.log(`historyPageLimit:  type is ${typeof historyBox.value?.clientHeight} data is ${JSON.stringify(historyBox.value?.clientHeight)}`);
        if ( historyBox.value?.clientHeight ) {
          return Number(roundNumberIntMin((historyBox.value?.clientHeight - 69) / 50));
        }
        return null;
      });
      const minHeightComp = computed(() => {
        if ( historyBox.value?.clientHeight) {
          return `${Number((historyBox.value?.clientHeight-100).toFixed())}px`;
        }
        return 'initial'
      });

      const errorImg = new URL(`@/assets/images/errorcode.svg`, import.meta.url).href;

      const columns = [
        {
          label: "",
          field: "root",
          width: "calc( 100% - 50px )",
          slot: true,
        },
        {
          label: "",
          field: "link",
          width: "50px",
          slot: true,
        },
      ];

      const errorHandler = () => {
        console.log(`errorHandler`);
        error.value = false;
        titleLoad.value = t('pages.dashboard.status.wait');
        messageLoad.value = t('pages.dashboard.status.gettingBalances');
        errorTitle.value = t('errors.balanceError');
        errorSubtitle.value = t('pages.send.pressOkToTryAgain');
      }

      const alertAddTokenCancel = () => {
        tokenObject.value = null;
        isShowConfirm.value = false;
      }

      const alertAddTokenConfirm = (e) => {
        console.log(`alertAddTokenConfirm TRUE`);
        useEventsBus().emit('confirmedAddToken', JSON.stringify(tokenObject.value));
        tokenObject.value = null;
        isShowConfirm.value = false;
      }

      const searchTokensResult = (event) => {
        searchTokens.value = event;
      }

      const searchTokensText = (event) => {
        searchTokensLength.value = event?.length;
      }

      useEventsBus().on('confirmAddToken',  (payload) => {
        console.log(`confirmAddToken `);
        tokenObject.value = JSON.parse(payload);
        isShowConfirm.value = true;
        console.log(`rpcProviderChange Enter if`);
      });

      useEventsBus().on('tokenBalanceUpdated', (payload) => {
        if (payload === 'newToken') { 
          searchTokens.value = null; // can work not property when search window is open and it closed when some token updated
          searchTokensLength.value = 0;
          searchComponent.value.clearInput();
        }
      });

      const receiveHandler = async () => {
        router.push({ name: 'receive' });
      }

      const sendHandler = async () => {
        router.push({ name: 'send' });
      }

      const refreshHandler = () => {
        loadingRefresh.value = true
        console.log(`loadingRefresh: ${loadingRefresh.value}`);
        setTokensBalances();
        loadingRefresh.value = false
        console.log(`loadingRefresh: ${loadingRefresh.value}`);
      }

      onMounted( async () => {
        if ( store.state.user?.seedPhrase !== null ) {
          store.dispatch('user/resetSeedPhrase');
        }
        console.log(`store.state.user.publicKeyCard: ${JSON.stringify(store.state.user.publicKeyCard)}`);
        // if (!store.state.user.publicKeyCard || store.state.user.publicKeyCard.ed25519 === '0000000000000000000000000000000000000000000000000000000000000000') {
        //   router.push({ name: 'authorization' });
        // }
        balance.value = store.state.user.tokenBalance;
      });

      onErrorCaptured(async(err) => {
        console.log(`onErrorCaptured:  type is ${typeof err} data is ${typeof err === 'object' || typeof err === 'array' ? JSON.stringify(err) : err}`);
        console.log(`onErrorCaptured:  message is ${err?.message}`);
        const {title, message} = await getErrorMessage(err);
        error.value = true;
        errorTitle.value = title ?? t('errors.sendTokenError');
        errorSubtitle.value = message ?? t('pages.send.pressOkToTryAgain');
        console.log(`errorBody = ${err?.cause?.errorBody}`);
        const messageConsole = err?.cause?.errorTitle ? `errorTitle: ${err?.cause?.errorTitle}, ` : null 
          + err?.cause?.errorSubtitle ? `errorSubtitle: ${err?.cause?.errorSubtitle}, ` : null
          + err?.cause?.errorBody ? typeof err?.cause?.errorBody === 'object' || typeof err?.cause?.errorBody  === 'array' ? `errorBody: ${JSON.stringify(err?.cause?.errorBody)}, ` : `errorBody: ${err?.cause?.errorBody}, ` : null;
        console.log(messageConsole);
        isLoading.value = false;
        return false;
      });

      return { isLoading, isReSearch, balance, columns, searchTokensLength, activeTab, loadingRefresh, refreshHandler, alertAddTokenCancel, alertAddTokenConfirm, minHeightComp, 
        receiveHandler, sendHandler, page, error, titleLoad, messageLoad, errorTitle, errorSubtitle, isShowConfirm, tokenObject, tokensBalance, errorImg, historyPageLimit, historyBox, 
        searchTokensResult, searchTokens, searchTokensText, searchComponent, historyElement, historyElementComp, errorSearch, roundNumber, errorHandler, firstTabName, secondTabName,
        storeProvider
      }
    },
  }
</script>

<style scoped lang="scss">
.container-main{
  width: 90%;
  height: 100%;
  flex-direction: column;
  justify-content: flex-start;

  &.falc {
    justify-content: center;
  }

.container-box {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;

  .title{
    font-size: 36px;
    line-height: 48px;
    font-weight: 600;
    letter-spacing: 0em;
    text-align: center;
    margin: 0;
    padding-bottom: 36px;
  }
  .subtitle{
    font-size: 16px;
    font-weight: 400;
    line-height: 19px;
    letter-spacing: 0em;
    text-align: center;
    margin-bottom: 20px;
  }

  .balance-sum {
    padding: 0 20px;
    margin-bottom: 12px;
  }

  .balance {
    display: flex;
    width: calc(100% - 40px);
    flex-direction: column;
    align-items: center;
    border-radius: 20px;
    border: 3px solid rgba(205, 205, 205, 0.08);
    background-color: rgb(23, 23, 23);
    margin-bottom: 10px;
    z-index: 6;
    position: relative;
    padding: 20px 20px 20px;

    .balance-title {
      font-size: 18px;
      color: $color-gray;
      width: 100%;
      display: flex;
      flex-flow: row;
      justify-content: flex-start;
    }

    .balance-coin {
      font-size: 36px;
      color: rgb(255, 255, 255);
      width: 100%;
      display: flex;
      flex-flow: row;
      justify-content: flex-start;
      margin-top: 16px;
    }

    .balance-symbol {
      padding-right: 7px;
    }

    .balance-sub-coin {
      font-size: 18px;
      color: rgba(255, 255, 255, 0.4);
      display: flex;
      flex-flow: row;
      justify-content: flex-start;
      align-items: flex-end;
      margin-left: 15px;
    }

    .balance-sub-symbol {
      padding-left: 5px;
    }
  }
}

.history-box {
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: none;
  margin-bottom: 16px;
}

.history {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: calc(100% - 40px);
  min-height: calc(100% - 52px);
  height: initial;
  // min-width: 264px;
  padding: 20px 20px 0px;
  border-radius: 16px;
  border: 1px solid $color-black-40;
  background-color: $color-black-23;
  z-index: 6;
  position: relative;

  &.all-transactions {
    min-height: calc(100% - 22px);
  }
}

.history-group {
  width: 100%;
  //margin-top: 24px;
  height: initial;
  min-height: v-bind(historyElementComp);

  &.search {
    overflow-y: auto;
  }
}

.history-title {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.4);
  width: 100%;
  display: flex;
  flex-flow: row;
  justify-content: flex-start;

  &.top-gap {
    margin-top: 20px;
  }
}

  .vtl {
    margin-top: 16px;
  }

  .buttons-group {
    display: flex;
    width: 100%;
    position: relative;
    bottom: 0px;

    .button-main {
      position: relative;
      width: 50%;
      bottom: 0px;
      margin: 0px;

      &:first-of-type {
        margin: 0px 5% 0px 0px ;
      }

      svg {
        height: 16px;
      }
    }
  }

  .token-btn {
    display: flex;
    width: 24px;
    height: 24px;
    align-items: center;
    justify-content: center;

    svg {
      width: 14px;
      height: 14px;
    }
  }
}
</style>