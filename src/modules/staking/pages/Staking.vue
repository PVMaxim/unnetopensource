<template>
  <main>
    <div class="container-main" :class="[{ falc: isLoading || error }]">
      <Loading v-if="isLoading" :messageLoad="messageLoad" :titleLoad="titleLoad" />
      
      <Panel v-else-if="error" 
        :title="$t('errors.stakingError') || 'Staking Error'" 
        :subtitle="error" 
        :iconUrl="errorImg"
        :buttonClick="loadData" 
        :buttonName="$t('button.retry') || 'Retry'" 
      />

      <template v-else>
        <div class="container-box">
          <div class="staking-header">
            <h1 class="staking-title">{{ $t('staking.title') || 'Staking & Yield' }}</h1>
            <div class="network-badge">{{ activeNetworkName }}</div>
          </div>

          <!-- Network Compatibility Warning -->
          <div v-if="!isNetworkSupported" class="not-supported-card">
            <div class="not-supported-icon">⚠️</div>
            <h3>{{ $t('staking.unsupportedNetwork') || 'Network not supported' }}</h3>
            <p>
              {{ $t('staking.unsupportedNetworkDesc') || 'Staking is currently not supported on the active network. Please switch to Ethereum, Arbitrum, Base, BNB Chain, or Avalanche in your wallet settings to participate in Yield Vaults.' }}
            </p>
          </div>

          <!-- Staking Vaults List -->
          <div v-else class="vaults-list">
            <div v-if="vaults.length === 0" class="no-vaults">
              {{ $t('staking.noVaults') || 'No active vaults found for this network.' }}
            </div>
            
            <div v-else v-for="vault in vaults" :key="vault.address" class="vault-card">
              <div class="vault-info">
                <img :src="vault.logo" class="vault-logo" @error="handleLogoError($event)" />
                <div class="vault-details">
                  <span class="vault-name">{{ vault.name }}</span>
                  <span class="vault-symbol">{{ vault.symbol }}</span>
                </div>
              </div>
              
              <div class="vault-metrics">
                <div class="metric">
                  <span class="metric-label">{{ $t('staking.apy') || 'APY' }}</span>
                  <span class="metric-value green">{{ vault.apy }}%</span>
                </div>
                <div class="metric">
                  <span class="metric-label">{{ $t('staking.tvl') || 'TVL' }}</span>
                  <span class="metric-value">{{ vault.vaultTvl || '0.00' }} {{ vault.assetSymbol }}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">{{ $t('staking.yourStake') || 'Your Stake' }}</span>
                  <span class="metric-value">{{ vault.userStakedShares || '0.00' }} {{ vault.symbol }}</span>
                </div>
              </div>

              <Button
                buttonType="main"
                buttonRound="round12"
                :buttonName="$t('staking.manage') || 'Manage'"
                @onClick="openManageModal(vault)"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- Staking Modal -->
      <StakingModal 
        v-if="showModal && selectedVault" 
        :vault="selectedVault" 
        @close="closeManageModal" 
        @refresh="refreshData"
      />
    </div>
  </main>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import Loading from '@/components/Loading.vue';
import Panel from '@/components/Panel.vue';
import Button from '@/components/Button.vue';
import StakingModal from '../components/StakingModal.vue';

export const SUPPORTED_STAKING_NETWORKS = [
  'Ethereum',
  'Arbitrum',
  'Base',
  'BNB Chain',
  'Avalanche'
];

export default {
  name: 'StakingPage',
  components: {
    Loading,
    Panel,
    Button,
    StakingModal
  },
  setup() {
    const errorImg = new URL('@/assets/images/errorcode.svg', import.meta.url).href;
    const store = useStore();
    const showModal = ref(false);
    const selectedVault = ref(null);
    const titleLoad = ref('Loading');
    const messageLoad = ref('Fetching staking data...');

    const vaults = computed(() => store.state.staking?.vaults || []);
    const isLoading = ref(false);
    const error = ref(null);

    const activeNetworkName = computed(() => store.state.settings.rpcProvider?.name || 'Unknown');
    const isNetworkSupported = computed(() => SUPPORTED_STAKING_NETWORKS.includes(activeNetworkName.value));

    const loadData = async () => {
      if (!isNetworkSupported.value) return;
      isLoading.value = true;
      error.value = null;
      try {
        await store.dispatch('staking/loadVaults');
      } catch (err) {
        error.value = err.message || "Failed to load vaults";
      } finally {
        isLoading.value = false;
      }
    };

    const refreshData = async () => {
      if (!isNetworkSupported.value) return;
      try {
        await store.dispatch('staking/refreshBalances');
      } catch (err) {
        console.error("[StakingPage] Failed to refresh balances:", err);
      }
    };

    const openManageModal = (vault) => {
      selectedVault.value = vault;
      showModal.value = true;
    };

    const closeManageModal = () => {
      showModal.value = false;
      selectedVault.value = null;
    };

    const handleLogoError = (e) => {
      e.target.src = 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'; // Fallback
    };

    onMounted(async () => {
      await loadData();
    });

    // Reload vaults if rpc provider changes
    watch(() => store.state.settings.rpcProvider, async () => {
      await loadData();
    });

    return {
      vaults,
      isLoading,
      error,
      activeNetworkName,
      isNetworkSupported,
      showModal,
      selectedVault,
      titleLoad,
      messageLoad,
      errorImg,
      loadData,
      refreshData,
      openManageModal,
      closeManageModal,
      handleLogoError
    };
  }
};
</script>

<style lang="scss" scoped>

main {
  .container-main {
    width: 90%;
    height: 100%;
    flex-direction: column;
  }
}
.staking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  
  .staking-title {
    font-size: 28px;
    font-weight: 700;
    color: $color-white;
  }

  .network-badge {
    background-color: $color-black-dark;
    color: $color-orange;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    border: 1px solid rgba($color-orange, 0.2);
  }
}

.not-supported-card {
  background-color: $color-black-light;
  border: 1px solid rgba($color-orange, 0.2);
  border-radius: 16px;
  padding: 40px 20px;
  text-align: center;
  margin-top: 40px;

  .not-supported-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  h3 {
    color: $color-white;
    font-size: 20px;
    margin-bottom: 12px;
  }

  p {
    color: $color-gray;
    font-size: 15px;
    max-width: 500px;
    margin: 0 auto;
    line-height: 1.5;
  }
}

.vaults-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-top: 10px;
}

.no-vaults {
  text-align: center;
  color: $color-gray;
  padding: 40px;
  background-color: $color-black-light;
  border-radius: 16px;
}

.vault-card {
  background-color: $color-black-light;
  border: 1px solid rgba($color-white, 0.05);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  @include transition(all 0.2s ease-in-out);

  &:hover {
    border-color: rgba($color-orange, 0.3);
    @include transforma(translateY(-2px));
  }

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .vault-info {
    display: flex;
    align-items: center;
    gap: 16px;

    .vault-logo {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background-color: $color-black;
      padding: 4px;
    }

    .vault-details {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .vault-name {
        color: $color-white;
        font-size: 18px;
        font-weight: 600;
      }

      .vault-symbol {
        color: $color-gray;
        font-size: 14px;
      }
    }
  }

  .vault-metrics {
    display: flex;
    gap: 30px;
    flex-wrap: wrap;

    .metric {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .metric-label {
        color: $color-gray;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .metric-value {
        color: $color-white;
        font-size: 16px;
        font-weight: 600;

        &.green {
          color: $color-green;
        }
      }
    }
  }

  .button-main {
    align-self: flex-start;
    padding: 12px 28px;
    font-size: 15px;
    font-weight: 600;
    
    @media (min-width: 768px) {
      align-self: center;
    }
  }
}
</style>
