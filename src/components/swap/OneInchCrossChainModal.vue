<template>
  <Teleport to="body">
    <div class="backdrop" v-if="isOpen">
      <div class="loader-wrapper" v-if="isLoading">
        <Loading v-if="isLoading" :titleLoad="'Loading'" />
      </div>
      <PinCode
        v-else-if="pinState"
        title="Enter PIN"
        v-model="pinPre"
        :error="null"
        :buttonClick="null"
        :useStorePinCode="true"
        @isStore="onStorePinChange($event.value)"
        @cancelButton="onPinCancelButton($event.value)"
        @change="onPinChange($event.value)"
        v-model:numberOfDigits="pinLength"
        @changePinLength="changePinLength()"
      />
      <div v-else-if="isError" class="loader-wrapper">
        <Panel
          v-if="isError"
          :title="errorTitle"
          :subtitle="errorMessage"
          :buttonClick="closeErrorModal"
          :iconUrl="errorImg"
          buttonName="Ok"
        />
      </div>
      <div v-else class="one-inch-cross-modal-content">
        <close-icon
          @click="closeModal"
          class="one-inch-cross-modal-close-icon"
        />
        <div class="one-inch-cross-modal-steps">
          <div
            v-if="checkStepInclude(SWAP_ONE_INCH_CROSS_CHAIN_STEPS.Wrap)"
            class="one-inch-cross-modal-step"
            :class="{
              'one-inch-cross-modal-step-active': checkIsStepActive(
                SWAP_ONE_INCH_CROSS_CHAIN_STEPS.Wrap
              ),
            }"
          >
            <div class="one-inch-cross-modal-step-titles">
              <span
                >{{
                  getStepNumber(SWAP_ONE_INCH_CROSS_CHAIN_STEPS.Wrap)
                }}.</span
              >
              <span class="one-inch-cross-modal-step-title"
                >To continue, click below to wrap your
                {{ wrapData.fromToken.symbol }} to
                {{ wrapData.toToken.symbol }} via an on-chain ERC20
                transaction.</span
              >
            </div>

            <div class="one-inch-cross-modal-step-wrap">
              <div class="one-inch-cross-modal-step-wrap-token">
                <SwapTokenIcon
                  :token="wrapData.fromToken"
                  iconClass="one-inch-cross-modal-step-icon"
                />
                <p class="one-inch-cross-modal-step-wrap-token-title">
                  {{ `${wrapData.fromToken.symbol} ${wrapData.amount}` }}
                </p>
              </div>

              <div class="one-inch-cross-modal-step-arrow-icon-wrapper">
                <swapArrowIcon />
              </div>

              <div class="one-inch-cross-modal-step-wrap-token">
                <SwapTokenIcon
                  :token="wrapData.toToken"
                  iconClass="one-inch-cross-modal-step-icon"
                />
                <p class="one-inch-cross-modal-step-wrap-token-title">
                  {{ `${wrapData.toToken.symbol} ${wrapData.amount}` }}
                </p>
              </div>
            </div>
          </div>
          <div
            v-if="checkStepInclude(SWAP_ONE_INCH_CROSS_CHAIN_STEPS.Approve)"
            class="one-inch-cross-modal-step"
            :class="{
              'one-inch-cross-modal-step-active': checkIsStepActive(
                SWAP_ONE_INCH_CROSS_CHAIN_STEPS.Approve
              ),
            }"
          >
            <div class="one-inch-cross-modal-step-titles">
              <span
                >{{
                  getStepNumber(SWAP_ONE_INCH_CROSS_CHAIN_STEPS.Approve)
                }}.</span
              >
              <span class="one-inch-cross-modal-step-title"
                >It is required to give a one-time approval of
                {{ approveToken.symbol }} via an on-chain ERC20 Approve
                transaction.</span
              >
            </div>
          </div>
          <div
            v-if="checkStepInclude(SWAP_ONE_INCH_CROSS_CHAIN_STEPS.Confirm)"
            class="one-inch-cross-modal-step"
            :class="{
              'one-inch-cross-modal-step-active': checkIsStepActive(
                SWAP_ONE_INCH_CROSS_CHAIN_STEPS.Confirm
              ),
            }"
          >
            <div class="one-inch-cross-modal-step-titles">
              <span
                >{{
                  getStepNumber(SWAP_ONE_INCH_CROSS_CHAIN_STEPS.Confirm)
                }}.</span
              >
              <span class="one-inch-cross-modal-step-title">
                Confirm {{ approveToken.symbol }} swap to {{ toToken.symbol }}
              </span>
            </div>
          </div>
        </div>
        <Button
          :buttonName="activeStep"
          @click="checkPin"
          class="one-inch-cross-modal-confirm-button"
        ></Button>
      </div>
    </div>
    <NFCHandlerWindow
      ref="nfcHandlerWindow"
      title="Touch your card"
      subTitle="Hold your card flat against the back of your device until this window is open."
      v-model:isActive="nfcIsActive"
      @onCancel="pinPre = null"
    />
  </Teleport>
</template>

<script>
import closeIcon from "@/components/svg/closeIcon.vue";
import Button from "@/components/Button.vue";
import { computed, watch, ref, shallowRef } from "vue";
import { useStore } from "vuex";
import Loading from "@/components/Loading.vue";
import Panel from "@/components/Panel.vue";
import swapArrowIcon from "@/components/svg/swapArrowIcon.vue";
import SwapTokenIcon from "@/components/SwapTokenIcon.vue";
import PinCode from "@/components/PinCode.vue";
import NFCHandlerWindow from "@/components/NFCHandlerWindow.vue";
import { prefixStore } from "@/api/ApiHandler";
import { setUniSettings } from "@/api/global-settings";
import { SWAP_ONE_INCH_CROSS_CHAIN_STEPS } from "@/api/swap/constants";
import { checkBalanceForFee } from "@/api/swap/utils/token";
import { BigNumber } from "bignumber.js";
import { SWAP_SERVICES } from "../../api/constants-types";
import oneInchFusionPlus from "../../api/swap/services/oneInchFusionPlus";
import oneInchFusionV2 from "../../api/swap/services/oneInchFusionV2";
const errorImg = new URL(`@/assets/images/errorcode.svg`, import.meta.url).href;

export default {
  name: "OneInchCrossChainModal",
  props: {
    nfcHandlerWindow: {
      type: Object,
      default: null,
      required: false,
    },
  },
  components: {
    closeIcon,
    Button,
    Loading,
    Panel,
    swapArrowIcon,
    SwapTokenIcon,
    PinCode,
    NFCHandlerWindow,
  },

  setup() {
    const store = useStore();

    const nfcHandlerWindow = ref(NFCHandlerWindow);
    const nfcIsActive = ref(false);

    const pinState = ref(false);
    const pinPre = ref(null);
    const needStorePin = ref(false);
    const secrets = ref([]);
    const service = ref();

    const pinLength = computed(() => {
      if (
        typeof store.state[`${prefixStore.value}.customtoken`]?.pinLength !==
        undefined
      ) {
        return store.state[`${prefixStore.value}.customtoken`]?.pinLength;
      }
      return 4;
    });

    const isLoading = ref(false);

    const isError = ref(false);
    const errorTitle = ref("");

    const steps = ref([]);
    const activeStep = ref("");

    const isOpen = computed(
      () => store.state.swap.isOpenOneInchCrossChainModal
    );

    const approveToken = computed(
      () => wrapData.value.toToken || store.state.swap.fromToken
    );

    const toToken = computed(() => store.state.swap.toToken);

    const wrapData = ref({});

    const checkStepInclude = (step) => {
      return steps.value.includes(step);
    };

    const checkIsStepActive = (step) => {
      return activeStep.value === step;
    };

    const getStepNumber = (step) => {
      const idx = steps.value.findIndex((s) => s === step);
      return idx === -1 ? 0 : idx + 1;
    };

    const changePinLength = () => {
      pinPre.value = null;
    };

    const onStorePinChange = async (value) => {
      needStorePin.value = value;
    };

    const onPinCancelButton = () => {
      pinState.value = false;
      pinPre.value = null;
      needStorePin.value = false;
    };

    const onPinChange = async () => {
      if (pinPre.value?.length !== pinLength.value) {
        return;
      }

      pinState.value = false;
      pinEnterCallback();
    };

    const pinEnterCallback = () => {
      if (activeStep.value === SWAP_ONE_INCH_CROSS_CHAIN_STEPS.Wrap) {
        wrap();
      } else if (activeStep.value === SWAP_ONE_INCH_CROSS_CHAIN_STEPS.Approve) {
        approve();
      } else {
        confirm();
      }
    };

    const checkPin = async () => {
      if (needStorePin.value) {
        pinPre.value = storePin.value;
        pinEnterCallback();
      } else {
        pinState.value = true;
      }
    };

    const signTransaction = async (transaction) => {
      try {
        setUniSettings({
          ioMethod:
            store.state.settings.cardReaderPriority === "fido" ? "fido" : "nfc",
        });
        console.log("signTransaction", transaction);
        const resultStart = shallowRef(null);
        resultStart.value =
          await nfcHandlerWindow.value.nfcProgressChunksHandler(
            transaction,
            pinPre.value,
            true
          );
      } catch (err) {
        console.log(
          `nfcHandlerWindow ERROR:  type is ${typeof err} data is ${JSON.stringify(err)}`
        );
        throw err?.cause?.errorBody
          ? new Error(err.message, { cause: err?.cause })
          : new Error(`Error signing transaction: ${err.message}`);
      } finally {
        pinPre.value = null;
      }
    };

    const initializeSteps = async () => {
      isLoading.value = true;
      try {
        if (service.value.checkIsNeedWrap(store.state.swap.fromToken)) {
          wrapData.value = service.value.getWrapData(
            store.state.swap.fromToken,
            store.state.swap.quoteData.txData.fromTokenAmount
          );
          steps.value.push(SWAP_ONE_INCH_CROSS_CHAIN_STEPS.Wrap);
        }

        if (
          await service.value.checkApprove(
            store.state.swap.fromToken,
            store.state.user.publicKeyCard,
            store.state.swap.quoteData.txData.fromTokenAmount,
            store.state.swap.fromProvider
          )
        ) {
          steps.value.push(SWAP_ONE_INCH_CROSS_CHAIN_STEPS.Approve);
        }
        steps.value.push(SWAP_ONE_INCH_CROSS_CHAIN_STEPS.Confirm);
        activeStep.value = steps.value[0];
      } catch (error) {
        isError.value = true;
        console.error("Error during initialization:", error);
      } finally {
        isLoading.value = false;
      }
    };

    const goToNextStep = () => {
      const currentStepIndex = steps.value.findIndex(
        (step) => step === activeStep.value
      );
      if (currentStepIndex === -1) {
        return;
      }
      const nextStep = steps.value[currentStepIndex + 1];
      if (nextStep) {
        activeStep.value = nextStep;
      }
    };

    const setService = () => {
      if (
        store.state.swap.quoteData.txData.dex === SWAP_SERVICES.OneInchFusionV2
      ) {
        service.value = oneInchFusionV2;
      } else {
        service.value = oneInchFusionPlus;
      }
    };

    watch(isOpen, async (opened) => {
      if (opened) {
        setService();
        await initializeSteps();
      }
    });

    const closeModal = () => {
      store.dispatch("swap/closeOneInchCrossChainModal");
      steps.value = [];
      activeStep.value = "";
      isLoading.value = false;
      isError.value = false;
      errorTitle.value = "";
      secrets.value = [];
      wrapData.value = {};
    };

    const closeErrorModal = () => {
      isError.value = false;
      errorTitle.value = "";
    };

    const wrap = async () => {
      isLoading.value = true;
      try {
        const tx = await service.value.wrapToken(
          store.state.swap.fromProvider,
          wrapData.value.toToken,
          wrapData.value.amount,
          store.state.user.publicKeyCard
        );
        const fee = await tx.estimateFee();
        await checkBalanceForFee({
          swapProvider: store.state.swap.fromProvider,
          feeAmount: fee,
          publicKey: store.state.user.publicKeyCard,
        });
        await signTransaction(tx);
        await tx.send();
        goToNextStep();
      } catch (error) {
        console.error(error);
        isError.value = true;
        errorTitle.value = error?.message ?? "Wrap error";
      } finally {
        pinPre.value = null;
        needStorePin.value = false;
        isLoading.value = false;
      }
    };

    const approve = async () => {
      isLoading.value = true;
      try {
        const swapToken = wrapData.value.toToken || store.state.swap.fromToken;
        const tx = await service.value.approveToken(
          store.state.swap.fromProvider,
          swapToken,
          store.state.swap.quoteData.txData.fromTokenAmount,
          store.state.user.publicKeyCard
        );
        const fee = await tx.estimateFee();
        await checkBalanceForFee({
          swapProvider: store.state.swap.fromProvider,
          feeAmount: fee,
          publicKey: store.state.user.publicKeyCard,
        });
        await signTransaction(tx);
        await tx.send();
        goToNextStep();
      } catch (error) {
        console.error(error);
        isError.value = true;
        errorTitle.value = error?.message ?? "Approve error";
      } finally {
        pinPre.value = null;
        needStorePin.value = false;
        isLoading.value = false;
      }
    };

    const confirm = async () => {
      isLoading.value = true;
      try {
        const { tx, orderId, dstAmount } =
          await service.value.createTransaction({
            fromProvider: store.state.swap.fromProvider,
            fromToken: wrapData.value.toToken,
            toToken: store.state.swap.toToken,
            fromAmount: store.state.swap.fromAmount,
            toProvider: store.state.swap.toProvider,
            publicKeyCard: store.state.user.publicKeyCard,
          });
        await signTransaction(tx);
        await tx.send();
        service.value.updateOrderAnaUploadHash({ orderId });
        store.dispatch("swap/openSuccessSwapModal", {
          token: store.state.swap.toToken,
          amount: new BigNumber(dstAmount)
            .shiftedBy(-store.state.swap.toToken?.decimals)
            .toFixed(),
        });
        closeModal();
      } catch (error) {
        console.log({ error });
        isError.value = true;
        errorTitle.value = error?.message ?? "Wrap error";
      } finally {
        pinPre.value = null;
        needStorePin.value = false;
        isLoading.value = false;
      }
    };

    return {
      isOpen,
      closeModal,
      isLoading,
      isError,
      errorImg,
      checkIsStepActive,
      checkStepInclude,
      getStepNumber,
      wrapData,
      approveToken,
      pinState,
      pinPre,
      pinLength,
      changePinLength,
      onPinCancelButton,
      onPinChange,
      onStorePinChange,
      checkPin,
      nfcHandlerWindow,
      nfcIsActive,
      toToken,
      activeStep,
      SWAP_ONE_INCH_CROSS_CHAIN_STEPS,
      errorTitle,
      closeErrorModal,
    };
  },
};
</script>

<style scoped lang="scss">
.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: $color-black;
  z-index: 12;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loader-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.one-inch-cross-modal-content {
  width: 100%;
  height: 90%;
  max-width: 620px;

  padding: 0 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.one-inch-cross-modal-close-icon {
  cursor: pointer;
  width: 24px;
  height: 24px;
  stroke: rgba(255, 152, 0, 1);
}

.one-inch-cross-modal-steps {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.one-inch-cross-modal-step {
  padding: 12px 16px;
  border: 2px solid transparent;
  border-radius: 12px;
  opacity: 0.6;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.one-inch-cross-modal-step-active {
  border-color: $color-orange;
  opacity: 1;
}

.one-inch-cross-modal-step-titles {
  display: flex;
  gap: 4px;
}

.one-inch-cross-modal-step-wrap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.one-inch-cross-modal-step-wrap-token {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
}

.one-inch-cross-modal-step-wrap-token-title {
  margin: 0;
  font-size: 14px;
}

.one-inch-cross-modal-confirm-button {
  margin-top: 24px;
  width: 100%;
  border-radius: 12px;
  font-family: 'Inter Tight';
  color: $color-black;
  font-size: 14px;
}
</style>

<style lang="scss">
.one-inch-cross-modal-step-icon {
  width: 40px;
  height: 40px;
}
</style>
