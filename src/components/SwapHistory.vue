<template>
    <div class="loader-wrapper" v-if="isLoading">
      <Loading
        v-if="isLoading"
        :messageLoad="'Getting Swap History'"
        :titleLoad="'Loading'"
      />
    </div>
    <div v-else-if="isError" class="loader-wrapper">
      <Panel
        v-if="isError"
        :title="errorTitle"
        :subtitle="errorMessage"
        :buttonClick="resetError"
        :iconUrl="errorImg"
        buttonName="Ok"
      />
    </div>
    <div v-else class="swap-history" ref="scrollContainer">
      <div v-if="tokensHistory.length === 0" class="history-not-found">
        Not found
      </div>
      <PullToRefresh :loading='isLoading' :minHeight=scrollContainer?.clientHeight-85 @refresh='refreshHandler'>
        <div
          v-for="histroyItem in currentPageTransactions"
          :key="histroyItem.id"
          class="swap-history-item">
          <div class="networks">
            <div class="network">
              <KeepAlive :include="'tokenIcon' + histroyItem?.fromChain">
                <TokenIcon :tokenIconSymbol="histroyItem?.fromChain" :tokenIconUrl="histroyItem?.iconUrl" iconClass="icon" />
              </KeepAlive>
              <div class="network-titles">
                <span class="network-title">{{
                  histroyItem.fromTokenSymbol.replace(/\s*\([^)]*\)/g, "")
                }}</span>
                <span class="amount">{{
                  numberFormatter(histroyItem.fromTokenAmount)
                }}</span>
              </div>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g opacity="0.2">
                <path
                  d="M9.33333 3.33325L14 7.99992M14 7.99992L9.33333 12.6666M14 7.99992H2"
                  stroke="white"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
            </svg>
            <div class="network">
              <KeepAlive :include="'tokenIcon' + histroyItem?.toChain">
                <TokenIcon :tokenIconSymbol="histroyItem?.toChain" :tokenIconUrl="histroyItem?.iconUrl" iconClass="icon" />
              </KeepAlive>
              <div class="network-titles">
                <span class="network-title">{{
                  histroyItem.toTokenSymbol.replace(/\s*\([^)]*\)/g, "")
                }}</span>
                <span class="amount">{{
                  histroyItem.toTokenAmount > 0
                    ? numberFormatter(histroyItem.toTokenAmount)
                    : "..."
                }}</span>
              </div>
            </div>
          </div>
          <div class="statuses">
            <div
              class="status-and-date"
              v-if="histroyItem.status !== SWAP_HISTORY_STATUSES.HOLD"
              @click="openInfoModal(histroyItem)"
            >
              <span
                v-if="histroyItem.status === SWAP_HISTORY_STATUSES.SUCCESS"
                class="success-status"
                >Success</span
              >
              <span
                v-else-if="histroyItem.status === SWAP_HISTORY_STATUSES.FAILED"
                class="failed-status"
                >Failed</span
              >
              <span
                v-else-if="histroyItem.status === SWAP_HISTORY_STATUSES.PENDING"
                class="pending-status"
                >Pending</span
              >
              <span v-else class="other-status">{{ histroyItem.status }}</span>
              <span class="date">{{
                format(new Date(histroyItem.createTime), "{MMM} {dd}, {HH}:{mm}")
              }}</span>
            </div>
            <button
              v-if="histroyItem.status === SWAP_HISTORY_STATUSES.HOLD"
              class="swap-confirm-modal-warn-button"
              @click="openModal(histroyItem.id)"
            >
              Action needed
            </button>
            <a
              v-else-if="histroyItem.depositHashExplore"
              :href="histroyItem.depositHashExplore"
              class="transaction-link"
              target="_blank"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 3.33325L10.6667 7.99992L6 12.6666"
                  stroke="white"
                  stroke-opacity="0.2"
                />
              </svg>
            </a>
            <div v-else class="transaction-link"></div>
          </div>
        </div>
      </PullToRefresh>
      <div v-if="pages?.length > 0" class="pagination">
        <div
          class="pagination-item"
          v-for="(n, index) in pages"
          :key="index"
          :class="{ disabled: currentPage === n }"
        >
          <div
            v-if="typeof n === 'number'"
            class="pagination-link"
            @click.prevent="goToPage(n)"
          >
            {{ n + 1 }}
          </div>
          <div v-else-if="typeof n === 'string'">...</div>
        </div>
      </div>
    </div>
  <SwapHistoryWarnModal
    :isOpen="isOpenModal"
    :close="closeModal"
    :selectedId="selectedId"
  />

  <SwapHistroryTransactionInfoModal
    :isOpen="isOpenInfoModal"
    :close="closeInfoModal"
    :transaction="selectedTransaction"
  />
</template>

<script>
import Loading from "@/components/Loading.vue";
import { computed, onMounted, watchEffect, ref, watch } from "vue";
import { getNetworkIcon , roundNumberIntMin } from "@/api/sub-utils";
import { format } from "@/plugins/datetime";
import { numberFormatter } from "../utils/numberFormater";
import { useStore } from "vuex";
import TokenIcon from "@/components/TokenIcon.vue";
import Panel from "@/components/Panel.vue";
import PullToRefresh from '@/components/PullToRefresh.vue';
import { SWAP_HISTORY_STATUSES } from "../api/constants-types";
import SwapHistoryWarnModal from "./SwapHistoryWarnModal.vue";
import SwapHistroryTransactionInfoModal from "./SwapHistroryTransactionInfoModal.vue";
const errorImg = new URL(`@/assets/images/errorcode.svg`, import.meta.url).href;

export default {
  name: "SwapHistory",
  components: {
    Loading,
    Panel,
    TokenIcon,
    PullToRefresh,
    SwapHistoryWarnModal,
    SwapHistroryTransactionInfoModal,
  },
  setup() {
    const store = useStore();
    const isLoading = computed(() => store.state.swapHistory.isLoading);
    const tokensHistory = computed(() => store.state.swapHistory.history);
    const isError = computed(() => store.state.swapHistory.isError);
    const errorTitle = computed(() => store.state.swapHistory.errorTitle);
    const errorMessage = computed(() => store.state.swapHistory.errorMessage);
    const currentPageTransactions = ref([]);
    const currentPage = ref(0);
    const pagesTransactions = ref([]);
    const pages = ref([]);

    const selectedId = ref(null);
    const isOpenModal = ref(false);

    const selectedTransaction = ref(null);
    const isOpenInfoModal = ref(false);

    const scrollContainer = ref(null);

    const historyPageLimit = computed(() => { 
      if ( scrollContainer.value?.clientHeight ) {
        return Number(roundNumberIntMin((scrollContainer.value?.clientHeight - 57) / 55));
      }
      return null;
    });

    const scrollToTop = () => {
      if (scrollContainer.value) {
        scrollContainer.value.scrollTop = 0;
      }
    };

    const divideHistoryByPages = (history) => {
      const result = [];
      for (let i = 0; i < history.length; i += historyPageLimit.value) { 
        result.push(history.slice(i, i + historyPageLimit.value));  
      }
      return result;
    };

    const openModal = (id) => {
      selectedId.value = id;
      isOpenModal.value = true;
    };

    const closeModal = () => {
      selectedId.value = null;
      isOpenModal.value = false;
    };

    const openInfoModal = (transaction) => {
      selectedTransaction.value = transaction;
      isOpenInfoModal.value = true;
    };

    const closeInfoModal = () => {
      selectedTransaction.value = null;
      isOpenInfoModal.value = false;
    };

    const refreshHandler = () => {
      store.dispatch("swapHistory/updateHistory");
      if (tokensHistory.value.length > 0) {
        pagesTransactions.value = divideHistoryByPages(tokensHistory.value);
        currentPage.value = 0;
        currentPageTransactions.value = pagesTransactions.value[0];
        calcPages();
      }
    }

    onMounted(() => {
      if (historyPageLimit.value !== null) {
        refreshHandler();
      }
    });

    watch([tokensHistory, historyPageLimit], ([history, limit]) => {
      if (history.length > 0 && limit !== null) {
        pagesTransactions.value = divideHistoryByPages(tokensHistory.value);
        currentPageTransactions.value =
          pagesTransactions.value[currentPage.value];
        calcPages();
      }
    });

    const calcPages = () => {
      if (pagesTransactions.value.length === 1) {
        pages.value = [];
        return;
      }
      if (pagesTransactions.value.length <= 5) {
        pages.value = pagesTransactions.value.map((_, index) => index);
      } else {
        pages.value = pagesTransactions.value
          .map((_, index) => {
            if (index === 0) return index;
            if (index === pagesTransactions.value.length - 1) return index;
            if (index === currentPage.value) return index;
            if (index === currentPage.value - 1) return index;
            if (index === currentPage.value + 1) return index;
            return "...";
          })
          .reduce((acc, curr) => {
            if (acc.length === 0 || acc[acc.length - 1] !== curr) {
              acc.push(curr);
            }
            return acc;
          }, []);
      }
    };

    const goToPage = (page) => {
      if (page < 0 || page >= pagesTransactions.value.length) return;
      currentPage.value = page;
      currentPageTransactions.value = pagesTransactions.value[page];
      calcPages();
      scrollToTop();
    };

    const resetError = () => {
      store.dispatch("swapHistory/resetError");
    };

    return {
      isLoading,
      tokensHistory,
      getNetworkIcon,
      format,
      numberFormatter,
      isError,
      errorTitle,
      errorMessage,
      resetError,
      errorImg,
      SWAP_HISTORY_STATUSES,
      pagesTransactions,
      currentPage,
      goToPage,
      currentPageTransactions,
      pages,
      scrollContainer,
      openModal,
      closeModal,
      isOpenModal,
      selectedId,
      isOpenInfoModal,
      closeInfoModal,
      openInfoModal,
      selectedTransaction,
      refreshHandler,
      historyPageLimit
    };
  },
};
</script>

<style scoped lang="scss">

.loader-wrapper {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.swap-history {
  display: flex;
  width: calc(100% - 40px);
  height: calc(100% - 42px);
  min-width: 264px;
  padding: 20px 20px;
  flex-direction: column;
  align-items: center;
  border-radius: 16px;
  border: 1px solid rgb(40, 40, 40);
  background-color: rgb(23, 23, 23);
  position: relative;

  .swap-history-item:not(:last-child) {
    border-bottom: 1px solid rgba(32, 32, 32, 1);
  }
}

.history-not-found {
  padding: 16px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
}

.swap-history-item {
  padding: 8px 0px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  box-sizing: border-box;

  &:first-of-type {
    padding-top: 0px;
  }
}

.networks {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  align-items: center;
  width: 70%;
}

.network {
  grid-column: span 3;
  display: flex;
  gap: 8px;
}

.network-titles {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
}

.network-title {
  font-size: 15px;
  line-height: 15px;
}

.amount {
  font-size: 12px;
  line-height: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.statuses {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-and-date {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: 6px;
}

.date {
  font-size: 11px;
  line-height: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.success-status {
  padding: 4px 6px;
  font-size: 12px;
  line-height: 12px;
  color: rgba(31, 219, 85, 1);
  border-radius: 26px;
  background: rgba(31, 219, 85, 0.1);
}

.failed-status {
  padding: 4px 6px;
  font-size: 12px;
  line-height: 12px;
  color: rgba(255, 61, 61, 1);
  border-radius: 26px;
  background: rgba(255, 61, 61, 0.1);
}

.pending-status {
  padding: 4px 6px;
  font-size: 12px;
  line-height: 12px;
  color: rgba(247, 205, 0, 1);
  border-radius: 26px;
  background: rgba(247, 205, 0, 0.1);
}

.other-status {
  padding: 4px 6px;
  font-size: 12px;
  line-height: 12px;
  color: rgba(255, 255, 255, 0.5);
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.1);
}

.swap-confirm-modal-warn-button {
  padding: 4px 6px;
  font-size: 12px;
  line-height: 12px;
  font-family: 'Inter Tight';
  background: $color-yellow;
  border-radius: 26px;
  color: $color-black;
  border: none;
  cursor: pointer;
}

.icon, .icon svg {
  width: 32px;
  height: 32px;
}

.transaction-link {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
}
.pagination {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  margin-top: 12px;

  .pagination-item.disabled {
    color: $color-orange;
    pointer-events: none;
    cursor: auto;
    outline: 1px solid $color-orange;
    border-radius: 7px;
  }

  .pagination-item:first-child {
    margin-left: 0;
  }

  .pagination-item {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: center;
    color: $color-orange;
    height: 33px;
    width: 33px;
  }

  .pagination-link {
    width: 100%;
    text-align: center;
  }
}

@media (min-width: 690px) {
  .networks {
    width: 60%;
    justify-content: space-between;
  }
}

@media (max-width: 400px) {
  .networks {
    gap: 8px;
  }
  .date {
    font-size: 10px;
    line-height: 10px;
  }
  .network-title {
    font-size: 12px;
  }
  .statuses {
    gap: 6px;
  }
  .transaction-link {
    width: 18px;
  }
}
</style>
