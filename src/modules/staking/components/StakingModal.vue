<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal-content" :class="[{ falc: isProcessing || error || success }]">
      
      <!-- Sub-states -->
      <Loading v-if="isProcessing" :messageLoad="messageLoad" :titleLoad="titleLoad" />
      
      <Panel v-else-if="error" 
        :title="$t('errors.stakingError') || 'Staking Error'" 
        :subtitle="error" 
        :iconUrl="errorImg"
        :buttonClick="clearError" 
        :buttonName="$t('button.ok') || 'OK'" 
      />

      <Panel v-else-if="success" 
        :title="$t('staking.successTitle') || 'Transaction Complete'" 
        :subtitle="successMessage"
        :iconUrl="successImg"
        :buttonClick="handleSuccessClose" 
        :buttonName="$t('button.ok') || 'OK'" 
      />

      <PinCode v-else-if="pinState"
        :title="$t('pin.enterPin') || 'Enter PIN code'"
        v-model="pinPre"
        :error="null"
        :buttonClick="null"
        :useStorePinCode="true"
        @isStore="storePin = $event"
        @cancelButton="pinCancelButton"
        @change="updatePin"
        v-model:numberOfDigits="pinLength"
        @changePinLength="changePinLength"
      />

      <!-- Main Modal UI -->
      <template v-else>
        <!-- NFC scan window embedded -->
        <div v-show="nfcIsActive" class="nfc-container">
          <NFCHandlerWindow 
            ref="nfcHandlerWindow"
            :title="$t('nfcHandler.touchYourCard') || 'Touch your card'"
            :subTitle="$t('nfcHandler.holdYourCard') || 'Hold your card next to the phone'"
            v-model:isActive="nfcIsActive"
            v-model:isLoading="isProcessing"
            @onCancel="nfcCancel"
          />
        </div>

        <div v-show="!nfcIsActive" class="modal-body">
          <div class="modal-header">
            <div class="vault-meta">
              <img :src="vault.logo" class="vault-logo-small" @error="handleLogoError($event)" />
              <div>
                <h2>{{ vault.name }}</h2>
                <p class="curator">Curator: {{ vault.curator || 'Upshift' }}</p>
              </div>
            </div>
            <button class="close-btn" @click="close">×</button>
          </div>

          <!-- Tabs -->
          <div class="modal-tabs">
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'deposit' }" 
              @click="activeTab = 'deposit'"
            >
              {{ $t('staking.deposit') || 'Deposit' }}
            </button>
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'withdraw' }" 
              @click="activeTab = 'withdraw'"
            >
              {{ $t('staking.withdraw') || 'Withdraw' }}
            </button>
          </div>

          <!-- Deposit Tab -->
          <div v-if="activeTab === 'deposit'" class="tab-content">
            <div class="input-group">
              <div class="input-header">
                <label>{{ $t('staking.amountToDeposit') }}</label>
                <span class="balance-label" @click="setMaxAmount">
                  {{ $t('staking.walletBalance') }}: {{ vault.userWalletBalance || '0.00' }} {{ vault.assetSymbol }} ({{ $t('staking.max') }})
                </span>
              </div>
              <div class="input-wrapper">
                <InputDigits 
                  inputId="deposit-amount"
                  inputClass="staking-amount-input"
                  v-model="amount" 
                  placeholder="0.00" 
                  v-model:errorMessage="amountErr"
                  :showError="false"
                />
                <span class="asset-symbol">{{ vault.assetSymbol }}</span>
              </div>
              <span v-if="amountErr" class="error-text">{{ amountErr }}</span>
            </div>

            <div class="yield-estimate">
              <div class="estimate-row">
                <span>{{ $t('staking.apy') }}</span>
                <span class="green">{{ vault.apy }}%</span>
              </div>
              <div class="estimate-row">
                <span>{{ $t('staking.estMonthlyYield') }}</span>
                <span>{{ estMonthlyYield }} {{ vault.assetSymbol }}</span>
              </div>
            </div>

            <div class="action-buttons">
              <!-- Approve step if allowance is insufficient -->
              <Button 
                v-if="needsApprove" 
                buttonType="main"
                buttonRound="round12"
                :isDisabled="!isValidAmount" 
                :buttonName="$t('staking.approveAction') + ' ' + vault.assetSymbol"
                @onClick="startTx('approve')"
              />
              
              <!-- Deposit step -->
              <Button 
                v-else 
                buttonType="main"
                buttonRound="round12"
                :isDisabled="!isValidAmount" 
                :buttonName="$t('staking.deposit')"
                @onClick="startTx('deposit')"
              />
            </div>
          </div>

          <!-- Withdraw Tab -->
          <div v-else class="tab-content">
            <div class="input-group">
              <div class="input-header">
                <label>{{ $t('staking.amountToWithdraw') }}</label>
                <span class="balance-label" @click="setMaxAmount">
                  {{ $t('staking.stakedBalance') }}: {{ vault.userStakedShares || '0.00' }} {{ vault.symbol }} ({{ $t('staking.max') }})
                </span>
              </div>
              <div class="input-wrapper">
                <InputDigits 
                  inputId="withdraw-amount"
                  inputClass="staking-amount-input"
                  v-model="amount" 
                  placeholder="0.00" 
                  v-model:errorMessage="amountErr"
                  :showError="false"
                />
                <span class="asset-symbol">{{ vault.symbol }}</span>
              </div>
              <span v-if="amountErr" class="error-text">{{ amountErr }}</span>
            </div>

            <div class="yield-estimate">
              <div class="estimate-row">
                <span>{{ $t('staking.currentValue') }}</span>
                <span>{{ vault.userStakedAssets || '0.00' }} {{ vault.assetSymbol }}</span>
              </div>
            </div>

            <div class="action-buttons">
              <Button 
                buttonType="main"
                buttonRound="round12"
                :isDisabled="!isValidAmount" 
                :buttonName="$t('staking.withdrawAction')"
                @onClick="startTx('withdraw')"
              />
            </div>
          </div>
        </div>
      </template>

    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from 'vue-i18n';
import Loading from '@/components/Loading.vue';
import Panel from '@/components/Panel.vue';
import Button from '@/components/Button.vue';
import InputDigits from '@/components/InputDigits.vue';
import PinCode from '@/components/PinCode.vue';
import NFCHandlerWindow from '@/components/NFCHandlerWindow.vue';
import { StakingService } from '../services/StakingService';
import { setUniSettings } from '@/api/global-settings';
import { ALLOWED_PING_LENGTH } from '@/api/constants-types';

export default {
  name: 'StakingModal',
  components: {
    Loading,
    Panel,
    Button,
    InputDigits,
    PinCode,
    NFCHandlerWindow
  },
  props: {
    vault: {
      type: Object,
      required: true
    }
  },
  emits: ['close', 'refresh'],
  setup(props, { emit }) {
    const errorImg = new URL('@/assets/images/errorcode.svg', import.meta.url).href;
    const successImg = new URL('@/assets/images/successcode.svg', import.meta.url).href;
    const store = useStore();
    const { t } = useI18n();

    const activeTab = ref('deposit');
    const amount = ref('');
    const amountErr = ref('');

    // Flow states
    const isProcessing = ref(false);
    const titleLoad = ref('');
    const messageLoad = ref('');
    const error = ref(null);
    const success = ref(false);
    const successMessage = ref('');

    // PIN & NFC Signing states
    const pinState = ref(false);
    const pinPre = ref(null);
    const pinLength = ref(ALLOWED_PING_LENGTH[0]); // default 4
    const storePin = ref(false);
    const nfcIsActive = ref(false);
    const nfcHandlerWindow = ref(null);
    
    const activeTxType = ref(null); // 'approve' | 'deposit' | 'withdraw'

    const needsApprove = computed(() => {
      if (activeTab.value !== 'deposit') return false;
      const parsedAmount = parseFloat(amount.value || '0');
      const allowance = parseFloat(props.vault.userAllowance || '0');
      return allowance < parsedAmount && props.vault.assetAddress.toLowerCase() !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    });

    const isValidAmount = computed(() => {
      const parsed = parseFloat(amount.value || '0');
      return !isNaN(parsed) && parsed > 0;
    });

    const estMonthlyYield = computed(() => {
      const val = parseFloat(amount.value || '0');
      if (isNaN(val)) return '0.00';
      const monthlyRate = (props.vault.apy / 100) / 12;
      return (val * monthlyRate).toFixed(props.vault.assetDecimals > 6 ? 4 : 2);
    });

    const setMaxAmount = () => {
      if (activeTab.value === 'deposit') {
        amount.value = props.vault.userWalletBalance || '0';
      } else {
        amount.value = props.vault.userStakedShares || '0';
      }
      validateAmount();
    };

    const validateAmount = () => {
      amountErr.value = '';
      const parsed = parseFloat(amount.value);
      if (isNaN(parsed) || parsed <= 0) {
        amountErr.value = t('errors.invalidAmount') || 'Invalid amount';
        return false;
      }
      if (activeTab.value === 'deposit') {
        const walletBal = parseFloat(props.vault.userWalletBalance || '0');
        if (parsed > walletBal) {
          amountErr.value = t('errors.balanceError') || 'Insufficient balance';
          return false;
        }
      } else {
        const stakedBal = parseFloat(props.vault.userStakedShares || '0');
        if (parsed > stakedBal) {
          amountErr.value = t('errors.balanceError') || 'Insufficient staked balance';
          return false;
        }
      }
      return true;
    };

    const close = () => {
      emit('close');
    };

    const clearError = () => {
      error.value = null;
    };

    const handleSuccessClose = () => {
      success.value = false;
      emit('refresh');
      close();
    };

    // PIN Handlers
    const pinCancelButton = () => {
      pinState.value = false;
      pinPre.value = null;
    };

    const changePinLength = () => {
      const idx = ALLOWED_PING_LENGTH.indexOf(pinLength.value);
      pinLength.value = ALLOWED_PING_LENGTH[(idx + 1) % ALLOWED_PING_LENGTH.length];
    };

    const updatePin = async () => {
      if (pinPre.value !== null && pinPre.value?.length === pinLength.value) {
        pinState.value = false;
        await executeTransactionFlow();
      }
    };

    const nfcCancel = () => {
      nfcIsActive.value = false;
      pinPre.value = null;
      isProcessing.value = false;
    };

    // Start Transaction trigger
    const startTx = async (type) => {
      activeTxType.value = type;
      if (!validateAmount()) return;

      // Check if PIN is stored in user session
      if (store.state.user.pinHash !== null && (store.state.user.pinHash?.date - Date.now()) > 0) {
        pinPre.value = store.state.user.pinHash?.pin;
        await executeTransactionFlow();
      } else {
        // Reset stored pin hash if expired
        store.dispatch('user/resetPinHash').catch(() => {});
        pinState.value = true;
      }
    };

    // Main Transaction flow: build -> sign (NFC) -> broadcast
    const executeTransactionFlow = async () => {
      isProcessing.value = true;
      titleLoad.value = t('pages.send.status.wait') || 'Wait';
      messageLoad.value = 'Preparing transaction...';

      let request = null;

      try {
        if (activeTxType.value === 'approve') {
          request = await StakingService.prepareApprove(props.vault, amount.value);
        } else if (activeTxType.value === 'deposit') {
          request = await StakingService.prepareDeposit(props.vault, amount.value);
        } else if (activeTxType.value === 'withdraw') {
          request = await StakingService.prepareRedeem(props.vault, amount.value);
        }

        if (!request) throw new Error("Failed to construct request");

        // Turn on NFC scanning interface
        setUniSettings({ ioMethod: store.state.settings.cardReaderPriority === 'fido' ? 'fido' : 'nfc' });
        nfcIsActive.value = true;
        messageLoad.value = 'Scanning hardware card...';

        // Scan & sign via hardware card
        const resultStart = await nfcHandlerWindow.value?.nfcProgressChunksHandler(request, pinPre.value, true);
        if (!resultStart) {
          throw new Error("NFC signing failed");
        }

        // Send signed tx to RPC
        messageLoad.value = 'Broadcasting transaction...';
        await request.send();

        // Save PIN code if requested
        if (pinPre.value !== null && storePin.value === true && store.state.user.pinHash === null) {
          await store.dispatch('user/setPinHash', { "pin": pinPre.value, "date": Date.now() + (1000 * 60 * 5) });
        }

        // Setup success messages
        success.value = true;
        if (activeTxType.value === 'approve') {
          successMessage.value = `Approval of ${amount.value} ${props.vault.assetSymbol} completed. You can now deposit.`;
        } else if (activeTxType.value === 'deposit') {
          successMessage.value = `Successfully deposited ${amount.value} ${props.vault.assetSymbol} into the yield pool.`;
        } else {
          successMessage.value = `Successfully withdrawn ${amount.value} ${props.vault.symbol} to your wallet.`;
        }

      } catch (err) {
        console.error("[StakingModal] Tx flow error:", err);
        error.value = err.message || "An unexpected error occurred during execution.";
      } finally {
        nfcIsActive.value = false;
        pinPre.value = null;
        isProcessing.value = false;
        activeTxType.value = null;
      }
    };

    const handleLogoError = (e) => {
      e.target.src = 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png';
    };

    return {
      activeTab,
      amount,
      amountErr,
      isProcessing,
      titleLoad,
      messageLoad,
      error,
      success,
      successMessage,
      errorImg,
      successImg,
      needsApprove,
      isValidAmount,
      estMonthlyYield,
      setMaxAmount,
      close,
      clearError,
      handleSuccessClose,
      
      // Pin/Nfc
      pinState,
      pinPre,
      pinLength,
      storePin,
      changePinLength,
      pinCancelButton,
      updatePin,
      nfcIsActive,
      nfcHandlerWindow,
      nfcCancel,
      startTx,
      handleLogoError
    };
  }
};
</script>

<style lang="scss" scoped>

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba($color-black, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background-color: $color-black-24;
  border: 1px solid rgba($color-white, 0.1);
  border-radius: 20px;
  width: 90%;
  max-width: 480px;
  padding: 30px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);

  &.falc {
    min-height: 250px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
}

.nfc-container {
  width: 100%;
}

.modal-body {
  width: 100%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;

  .vault-meta {
    display: flex;
    align-items: center;
    gap: 12px;

    .vault-logo-small {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background-color: $color-black;
      padding: 2px;
    }

    h2 {
      font-size: 18px;
      font-weight: 700;
      color: $color-white;
      margin: 0;
    }

    .curator {
      font-size: 12px;
      color: $color-gray;
      margin: 2px 0 0 0;
    }
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 28px;
    color: $color-gray;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    margin: -5px 0 0 0;

    &:hover {
      color: $color-white;
    }
  }
}

.modal-tabs {
  display: flex;
  background-color: $color-black-17;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 24px;

  .tab-btn {
    flex: 1;
    background: none;
    border: none;
    color: $color-gray;
    padding: 10px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    @include transition(all 0.2s ease);

    &:hover {
      color: $color-white;
    }

    &.active {
      background-color: $color-black-light;
      color: $color-orange;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
  }
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .input-header {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    
    label {
      color: $color-white;
      font-weight: 500;
    }

    .balance-label {
      color: $color-orange;
      cursor: pointer;
      font-weight: 600;
      
      &:hover {
        text-decoration: underline;
      }
    }
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;

    :deep(.input-container) {
      width: 100%;
      padding: 0;
    }

    :deep(.staking-amount-input) {
      width: 100% !important;
      background-color: $color-black-17 !important;
      border: 1px solid rgba($color-white, 0.1) !important;
      border-radius: 12px !important;
      padding: 16px 80px 16px 16px !important;
      color: $color-white !important;
      font-size: 18px !important;
      font-weight: 600 !important;
      outline: none !important;
      transition: border-color 0.2s !important;

      &:focus {
        border-color: $color-orange !important;
      }
    }

    .asset-symbol {
      position: absolute;
      right: 16px;
      color: $color-gray;
      font-weight: 600;
      font-size: 16px;
      z-index: 10;
    }
  }

  .error-text {
    color: $color-red;
    font-size: 12px;
    margin-top: 2px;
  }
}

.yield-estimate {
  background-color: $color-black-17;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .estimate-row {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    color: $color-gray;

    span:last-child {
      color: $color-white;
      font-weight: 600;
    }

    .green {
      color: $color-green !important;
    }
  }
}

.action-buttons {
  margin-top: 10px;
  
  .button-main {
    width: 100%;
    padding: 16px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 12px;
  }
}
</style>
