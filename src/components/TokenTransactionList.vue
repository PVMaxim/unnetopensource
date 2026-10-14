<template>
  <PullToRefresh :loading="loadingRefresh" @refresh="refreshHandler">
    <div class="transaction-history">
      <div v-if="isLoading" class="transaction-history-list center">
        <Loading />
      </div>

      <div v-else-if="transactionsList?.length > 0" class="transaction-history-list">
        <div 
          v-for="(item, index) in transactionsList" 
          :key="index" 
          class="transaction-history-item" 
          :class="{ 'pending': !item?.confirmed }" 
          @click="goToSendHandler"
        >
          <div class="token-row col-1">
            <div class="direction-icon" :class="[{ receive: item?.direction === 'in' }, { send: item?.direction === 'out' }]">
              <NarrowDown v-if="item?.direction === 'in'" />
              <NarrowUp v-if="item?.direction === 'out'" />
            </div>
          </div>

          <div class="token-col col-2">
            <div class="token-direction">
              <template v-if="item?.direction === 'in'">
                {{ $t('pages.send.historyList.receive') }}
              </template>
              <template v-else-if="item?.direction === 'out'">
                {{ $t('pages.send.historyList.send') }}
              </template>
            </div>
            <div class="token-row">
              <div class="token-date">
                {{ format(new Date(item.timestamp * 1000), "{dd}/{MM}/{yy} {HH}:{mm}:{ss}") }}
              </div>
              <div class="token-status" :class="[{ success: item.success }, { failed: !item.success }, { pending: !item?.confirmed }]">
                <template v-if="!item?.confirmed">
                  {{ $t('pages.send.historyList.pending') }}
                </template>
                <template v-else>
                  {{ item.success ? $t('pages.send.historyList.success') : $t('pages.send.historyList.failed') }}
                </template>
              </div>
            </div>
          </div>

          <div class="token-col col-3">
            <div class="token-balance" :class="[{ receive: item.direction === 'in' }, { send: item.direction === 'out' }]">
              <div class="token-balance-box">
                {{ item?.direction === 'in' ? '+' : '-' }}{{ roundNumber(item?.amount, 6) }}
              </div>
            </div>
            <div class="token-row token-row-right">
              <div class="token-ticker">
                {{ storeSelectedToken?.symbol }}
              </div>
              <div class="token-icon-16">
                <TokenIcon 
                  v-if="typeof storeSelectedToken === 'object'" 
                  :tokenIconSymbol="storeSelectedToken?.symbol" 
                  :tokenIconUrl="storeSelectedToken?.iconUrl" 
                  iconClass="icon" 
                />
              </div>
            </div>
          </div>

          <a :href="item.scannerUrl" class="token-link col-4" target="_blank">
            <narrow />
          </a>
        </div>
      </div>
      <div v-if="transactionsList?.length === 0 && !isLoading" class="transaction-history-empty">
        <boxIcon class="transaction-history-empty-icon" />
        <div class="transaction-history-empty-text">{{ $t('pages.send.historyList.noHistory') }}</div>
      </div>
    </div>
  </PullToRefresh>

  <!-- Pagination -->
  <div v-if="transactionsList?.length > 0 && !isLoading" class="pagination">
    <div 
      v-for="(n, index) in paging" 
      :key="index" 
      class="pagination-item" 
      :class="{ disabled: pagination.page === n }"
    >
      <div v-if="typeof n === 'number'" class="pagination-link" @click.prevent="goToPage(n)">
        {{ n }}
      </div>
      <div v-else-if="typeof n === 'string'">...</div>
    </div>
  </div>

</template>

<script>
import { defineComponent, ref, shallowRef, reactive, computed, watchEffect } from 'vue';
import { useStore } from 'vuex';
import { getToken } from '@/api/ApiHandler';
import { roundNumber } from '@/api/sub-utils';
import { format } from '@/plugins/datetime/index';
import Loading from '@/components/Loading.vue';
import PullToRefresh from '@/components/PullToRefresh.vue';
import TokenIcon from "@/components/TokenIcon.vue";
import narrow from '@/components/svg/narrowRight.vue';
import boxIcon from '@/components/svg/boxIcon.vue';
import NarrowUp from '@/components/svg/narrowUp.vue';
import NarrowDown from '@/components/svg/narrowDown.vue';

export default defineComponent({
  name: 'TokenTransactionList',
  components: {
    Loading,
    PullToRefresh,
    boxIcon,
    TokenIcon,
    narrow,
    NarrowUp,
    NarrowDown
  },
  props: {
    historyPageLimit: {
      type: [Number, null],
      default: null,
    },
    minHeight: {
      type: [String, null],
      default: null
    }
  },
  setup(props) {
    const store = useStore();
    const isLoading = ref(true);
    const loadingRefresh = ref(false);
    const transactionsList = ref([]);
    const token = shallowRef(null);
    
    const pagination = reactive({
      limit: props.historyPageLimit ?? 5,
      page: 1,
      total: null
    });

    const storeSelectedToken = computed(() => store.state.user.selectedToken?.[store.state.settings.rpcProvider?.name]);
    const minHeightComp = computed(() => props.minHeight || 'initial');

    const maxPage = computed(() => {
      if (!pagination.total || pagination.total <= 0) return 0;
      return Math.ceil(pagination.total / pagination.limit);
    });

    const offset = computed(() => (pagination.page - 1) * pagination.limit);

    const paging = computed(() => {
      if (maxPage.value < 2) return [];
      
      let startPage = Math.max(1, pagination.page - 2);
      if (maxPage.value - startPage < 4) {
        startPage = Math.max(1, maxPage.value - 4);
      }

      const pages = [];
      for (let i = startPage; i <= Math.min(maxPage.value, startPage + 4); i++) {
        pages.push(i);
      }

      if (!pages.includes(1)) {
        pages.unshift('...');
        pages.unshift(1);
      }
      if (!pages.includes(maxPage.value)) {
        pages.push('...');
        pages.push(maxPage.value);
      }
      return pages;
    });

    const fetchTransactions = async (isRefresh = false) => {
      if (!token.value) return;

      if (isRefresh) {
        loadingRefresh.value = true;
        pagination.page = 1;
      } else {
        isLoading.value = true;
      }

      const currentOffset = isRefresh ? 0 : offset.value;

      try {
        const response = await token.value.getTransactions({
          owner: store.state.user.accountAddress,
          limit: pagination.limit,
          offset: currentOffset
        });

        transactionsList.value = response?.items || [];
        pagination.total = response?.total || 0;
      } catch (err) {
        console.error(`[TokenTransactionList] fetchTransactions Error:`, err, {
          network: store.state.settings.rpcProvider?.name,
          token: token.value?.id,
          owner: store.state.user.accountAddress,
          limit: pagination.limit,
          offset: currentOffset
        });
        transactionsList.value = [];
        pagination.total = 0;
      } finally {
        isLoading.value = false;
        loadingRefresh.value = false;
      }
    };

    const goToPage = async (pageNumber) => {
      pagination.page = pageNumber;
      await fetchTransactions();
    };

    const refreshHandler = () => fetchTransactions(true);

    watchEffect(async () => {
      const selectedToken = store.state.user.selectedToken?.[store.state.settings.rpcProvider?.name];
      if (selectedToken?.root) {
        transactionsList.value = [];
        token.value = await getToken(selectedToken.root);
        pagination.page = 1;
        pagination.total = null;
        await fetchTransactions();
      }
    });

    return { 
      isLoading, 
      transactionsList, 
      roundNumber, 
      format, 
      pagination, 
      maxPage, 
      paging, 
      goToPage, 
      storeSelectedToken, 
      loadingRefresh, 
      refreshHandler, 
      minHeightComp 
    };
  }
});
</script>

<style scoped lang="scss">
  .transaction-history, .transaction-history-list {
    width: 100%;
    height: 100%;
  }
  .transaction-history-list {
    min-height: v-bind(minHeightComp);
  }

  .transaction-history-list.center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  } 

  .transaction-history-item {
    width: 100%;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;

    &:first-of-type {
      padding-top: 16px;
    }
  }
  .token-col {
    display: flex;
    flex-direction: column;
  }
  .token-row {
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .token-row-right {
    justify-content: flex-end;
  }
  .col-1 {
    flex-basis: 46px;
  }
  .col-2 {
    flex-basis: 80%;
  }
  .col-3 {
    flex-basis: 90px;
  }

  .direction-icon {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: center;
    align-items: center;
    width: 32px;
    height: 32px;
    margin-right: 14px;
    overflow: hidden;
    border-radius: 50%;

    svg {
      width: 20px;
      height: 20px;
    }

    &.send {
      background-color: rgba($color-red, 0.1);
      svg { fill: $color-red; }
    }
    &.receive {
      background-color: rgba($color-green, 0.1);
      svg { fill: $color-green; }
    }
  }
  .token-ticker {
    font-size: 11px;
    margin-right: 4px;
  }

  .token-icon-16 {
    width: 14px;
    height: 14px;

    :deep(.icon) {
      width: 14px;
      height: 14px;
      overflow: hidden;
      border-radius: 50%;
    }
  }

  .token-direction {
    font-size: 15px;
  }

  .token-balance {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: flex-end;
    align-items: center;
    font-size: 15px;
    height: 18px;
    flex-basis: auto !important;
    overflow: unset;

    &.receive { color: $color-green; }
    &.send { color: $color-red; }

    .token-balance-box {
      position: absolute;
    }
  }

  .token-date {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: center;
    color: rgba(255, 255, 255, 0.4);
    font-size: 11px;
    width: 90px;
  }

  .token-status {
    font-size: 11px;
    &.success { color: $color-green; }
    &.failed { color: $color-red; }
    &.pending { color: $color-yellow; }
  }

  .token-link {
    margin-left: 14px;
  }

  .pagination {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    margin-top: 12px;
    justify-content: center;

    .pagination-item.disabled {
      color: $color-orange;
      pointer-events: none;
      outline: 1px solid $color-orange;
      border-radius: 7px;
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
  }

  .transaction-history-empty {
    text-align: center;
    min-height: v-bind(minHeightComp);
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    .transaction-history-empty-text {
      color: rgba(255, 255, 255, 0.4);
      margin-top: 20px;
    }
  }
</style>