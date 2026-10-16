<template>
  <main v-if="showOverlay">
    <div class="container-main" :class="[{ falc: checkingOnboarded || (isLoading && !pinState && !nfcIsActive) || error || !pinState }]">
      <Loading v-if="checkingOnboarded || (isLoading && !pinState && !nfcIsActive)" :messageLoad="messageLoad" :titleLoad="titleLoad" />
      <Panel v-else-if="error"  
        :title="errorTitle" 
        :subtitle="errorSubtitle"
        :iconUrl="errorImg"
        :buttonClick="errorHandler"
        :buttonName="$t('button.ok')" 
      />

      <PinCode v-else-if="pinState"
        :title="$t('pin.enterPin')"
        v-model="pinPre"
        :error="null"
        :buttonClick="null"
        :useStorePinCode="true"
        @isStore="storePinHandler($event)"
        @cancelButton="pinCancelButton()"
        @change="updatePin()"
        v-model:numberOfDigits="pinLength"
        @changePinLength="changePinLength()"
      />

      <template v-else>
        <div class="container-box" v-show="!nfcIsActive">
          <div class="canton-card-modal">
            <div class="onboarding-content">
              <template v-if="!isOnboarded">
                <div v-if="showStepsView" class="steps-container">
                  <div class="header-icon-wrap">
                    <div class="main-icon">
                      <CantonIcon />
                    </div>
                  </div>

                  <div class="steps-header">
                    <h3 class="title">{{ $t('cantonOnboarding.stepsTitle') }}</h3>
                    <p class="subtitle">{{ $t('cantonOnboarding.stepsDescription') }}</p>
                  </div>

                  <div class="steps-list">
                    <div
                      v-for="step in onboardingSteps"
                      :key="step.actionType"
                      class="step-item"
                      :class="{
                        'step-completed': step.status === 'completed',
                        'step-active': step.status === 'in_progress',
                        'step-pending': step.status === 'pending'
                      }"
                    >
                      <div class="step-icon-box">
                        <svg v-if="step.actionType === 'CREATE_USER'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                        </svg>
                        <svg v-else-if="step.actionType === 'MINTING_DELEGATION'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="7.5" cy="15.5" r="5.5" />
                          <path d="m21 2-9.6 9.6" />
                          <path d="m15.5 7.5 3 3L22 7l-3-3" />
                        </svg>
                        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                      </div>

                      <div class="step-text">
                        <span class="step-title">{{ $t(`cantonOnboarding.steps.${step.actionType}.title`) }}</span>
                        <span class="step-desc">{{ $t(`cantonOnboarding.steps.${step.actionType}.description`) }}</span>
                      </div>

                      <div class="step-badge">
                        <span class="badge-indicator" :class="step.status">
                          <svg v-if="step.status === 'completed'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <svg v-else-if="step.status === 'in_progress'" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="6" />
                          </svg>
                          <svg v-else width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="5" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="steps-actions">
                    <Button
                      buttonType="main"
                      buttonRound="round12"
                      :buttonName="activeStepExists ? $t('button.continue') : $t('cantonOnboarding.buttonCreate')"
                      :isDisabled="isLoading || !activeStepExists"
                      :isLoading="isLoading"
                      @onClick="signCurrentStep()"
                    />
                  </div>
                </div>

                <div v-else class="intro-container">
                  <div class="header-icon-wrap">
                    <div class="main-icon">
                      <CantonIcon />
                    </div>
                  </div>

                  <div class="steps-header">
                    <h3 class="title">{{ $t('cantonOnboarding.title') }}</h3>
                    <p class="subtitle">{{ $t('cantonOnboarding.description') }}</p>
                  </div>

                  <div class="steps-actions">
                    <Button
                      buttonType="main"
                      buttonRound="round12"
                      :buttonName="$t('cantonOnboarding.buttonCreate')"
                      :isLoading="isLoading"
                      @onClick="openStepsView()"
                    />
                  </div>
                </div>
              </template>

              <template v-else-if="pendingTransfers.length > 0">
                <div class="header-icon-wrap">
                  <div class="icon-ring"></div>
                  <div class="main-icon">
                    <CantonIcon />
                  </div>
                </div>

                <div class="steps-header">
                  <h3 class="title">{{ $t('cantonOnboarding.pendingTransfersTitle') }}</h3>
                  <p class="subtitle">{{ $t('cantonOnboarding.pendingTransfersDescription') }}</p>
                </div>

                <div class="transfers-list">
                  <div v-for="transfer in pendingTransfers" :key="transfer.id" class="transfer-item">
                    <div class="transfer-info">
                      <div class="transfer-label-group">
                        <span class="transfer-sender">{{ $t('cantonOnboarding.from') }} <span class="sender-addr">{{ shortenAddress(transfer.sender) }}</span></span>
                      </div>
                      <div class="transfer-token-row">
                        <div class="transfer-token-badge">
                          <TokenIcon v-if="typeof transfer === 'object'" :tokenIconSymbol="transfer?.symbol" :tokenIconUrl="transfer?.iconUrl" iconClass="transfer-token-icon" />
                          <div class="transfer-token-names">
                            <span class="token-symbol">{{ transfer.symbol || '-' }}</span>
                            <span class="token-name">{{ transfer.name || 'Canton' }}</span>
                          </div>
                        </div>
                        <span class="transfer-amount">{{ roundNumber(transfer.amount, 6) }} {{ transfer.symbol || 'CC' }}</span>
                      </div>
                    </div>
                    <div class="transfer-actions">
                      <Button
                        class="button-main btn-action accept"
                        :buttonName="$t('button.accept')"
                        buttonType="main"
                        buttonRound="round12"
                        @onClick="startProcessTransfer(transfer, 'accept')"
                      />
                      <Button
                        class="button-secondary btn-action reject"
                        :buttonName="$t('button.reject')"
                        buttonType="second"
                        buttonRound="round12"
                        @onClick="startProcessTransfer(transfer, 'reject')"
                      />
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>

      <div class="container-box" v-show="nfcIsActive">
        <NFCHandlerWindow
          ref="nfcHandlerWindow"
          :title="currentNfcTitle || $t('nfcHandler.touchYourCard')"
          :subTitle="currentNfcSubtitle || $t('nfcHandler.holdYourCard')"
          v-model:isActive="nfcIsActive"
          v-model:isLoading="isLoading"
          @onCancel="cancelSigning()"
        />
      </div>
    </div>
  </main>
</template>

<script>
import { ref, shallowRef, computed, watch, onMounted, onUnmounted, onErrorCaptured } from 'vue';
import { useStore } from 'vuex';
import { useI18n } from 'vue-i18n';
import { RPC_NAMES } from '../api/constants-types';
import Loading from '@/components/Loading.vue';
import PinCode from '@/components/PinCode.vue';
import Button from '@/components/Button';
import NFCHandlerWindow from '@/components/NFCHandlerWindow.vue';
import Panel from '@/components/Panel.vue';
import TokenIcon from '@/components/TokenIcon.vue';
import { initialManager, prefixStore, isValidWalletAddress, getTokenObject } from '@/api/ApiHandler';
import { setUniSettings } from '@/api/global-settings';
import { useEventsBus } from '@/plugins/eventBus.js';
import { roundNumber, sha256, getErrorMessage } from '@/api/sub-utils';
import { useRoute } from 'vue-router';
import { isCardRegistered } from '@/api/check-guards';
import { isCantonOnboardingActive } from '@/plugins/cantonState';
import CantonIcon from '@/components/svg/provider/canton'

export default {
  name: 'CantonOnboardingOverlay',
  components: {
    Loading,
    PinCode,
    NFCHandlerWindow,
    Panel,
    TokenIcon,
    Button,
    CantonIcon
  },
  setup() {
    const store = useStore();
    const { t } = useI18n();
    const route = useRoute();

    const isExcludedRoute = (routePathOrName) => {
      if (!routePathOrName) return false;
      const path = String(routePathOrName).toLowerCase();
      return path.includes('restore-card') || 
             path.includes('settings') || 
             path.includes('re-registration-card') || 
             path.includes('sign-in') ||
             path.includes('authorization');
    };

    const isCurrentRouteExcluded = () => {
      const path = window.location.pathname;
      if (isExcludedRoute(path)) return true;
      if (route && route.name && isExcludedRoute(route.name)) return true;
      if (route && route.path && isExcludedRoute(route.path)) return true;
      return false;
    };

    const isCantonProvider = computed(() => {
      const name = store.state.settings.rpcProvider?.name;
      return name === RPC_NAMES.CANTON_TEST || name === RPC_NAMES.CANTON_DEV;
    });

    const isInitiallyCanton = store.state.settings.rpcProvider?.name === RPC_NAMES.CANTON_TEST || store.state.settings.rpcProvider?.name === RPC_NAMES.CANTON_DEV;
    const initialShowOverlay = isInitiallyCanton && isCardRegistered() && !isCurrentRouteExcluded();
    const showOverlay = ref(initialShowOverlay);
    const checkingOnboarded = ref(false);
    const isOnboarded = ref(true);

    const pendingTransfers = ref([]);
    const activeTransfer = ref(null);
    const activeAction = ref('');

    const pinState = ref(false);
    const pinPre = ref(null);
    const hashPinPre = ref(null);
    const storePin = ref(false);

    const nfcIsActive = ref(false);
    const nfcHandlerWindow = ref(NFCHandlerWindow);

    const isLoading = ref(false);
    const messageLoad = ref('');
    const titleLoad = ref('');

    const error = ref(false);
    const errorTitle = ref('');
    const errorSubtitle = ref('');
    const errorImg = new URL(`@/assets/images/errorcode.svg`, import.meta.url).href;

    const errorHandler = async () => {
      error.value = false;
      errorTitle.value = '';
      errorSubtitle.value = '';
      pinState.value = false;
      pinPre.value = null;
      activeTransfer.value = null;
      activeAction.value = '';
      if (showStepsView.value) {
        await refreshOnboardingSteps();
      } else {
        await checkCantonOnboarding();
      }
    };

    onErrorCaptured(async (err) => {
      const { title, message } = await getErrorMessage(err);
      error.value = true;
      errorTitle.value = title ?? t('errors.transferError');
      errorSubtitle.value = message ?? t('pages.send.pressOkToTryAgain');
      if (err?.cause) {
        const parts = [];
        if (err.cause.errorTitle) parts.push(`errorTitle: ${err.cause.errorTitle}`);
        if (err.cause.errorSubtitle) parts.push(`errorSubtitle: ${err.cause.errorSubtitle}`);
        if (err.cause.errorBody) {
          parts.push(`errorBody: ${typeof err.cause.errorBody === 'object' ? JSON.stringify(err.cause.errorBody) : err.cause.errorBody}`);
        }
        if (parts.length > 0) {
        }
      }
      isLoading.value = false;
      nfcIsActive.value = false;
      pinState.value = false;
      pinPre.value = null;
      activeTransfer.value = null;
      activeAction.value = '';
      return false;
    });

    const pinLength = computed(() => {
      if (store.state[`${prefixStore.value}.customtoken`]?.pinLength !== undefined) {
        return store.state[`${prefixStore.value}.customtoken`]?.pinLength;
      }
      return 4;
    });

    const shortenAddress = (addr) => {
      if (!addr) return '';
      if (addr.length <= 16) return addr;
      return addr.slice(0, 8) + '...' + addr.slice(-8);
    };

    const checkCantonOnboarding = async () => {
      if (checkingOnboarded.value) {
        return;
      }

      if (isCurrentRouteExcluded()) {
        showOverlay.value = false;
        return;
      }

      if (!isCantonProvider.value) {
        showOverlay.value = false;
        return;
      }

      if (!isCardRegistered()) {
        showOverlay.value = false;
        return;
      }

      const keys = store.state.user.publicKeyCard;
      if (!keys) {
        showOverlay.value = false;
        return;
      }

      checkingOnboarded.value = true;
      if (!isOnboarded.value) {
        showOverlay.value = true;
      }
      try {

        const mgr = shallowRef(initialManager(false));
        if (typeof mgr.value !== 'string' && mgr.value) {
          if (typeof mgr.value.setPrimaryCard === 'function') {
            mgr.value.setPrimaryCard(keys);
          }

          const check = await mgr.value.isOnBoarded(keys);
          isOnboarded.value = check;

          if (!check) {
            showOverlay.value = true;
            pendingTransfers.value = [];
          } else {
            const transfers = await mgr.value.getPendingTransfers(keys);
            const providerName = store.state.settings.rpcProvider?.name || RPC_NAMES.CANTON_TEST;
            const storeTokens = store.state.user?.tokenBalance?.[providerName] || [];

            const richTransfers = await Promise.all((transfers || []).map(async (t) => {
              let symbol = null;
              let name = null;
              let iconUrl = null;

              const foundInStore = storeTokens.find((st) => st?.root === t.tokenId || st?.address === t.tokenId);
              if (foundInStore) {
                symbol = foundInStore.symbol;
                name = foundInStore.name;
                iconUrl = foundInStore.iconUrl;
              } else if (t.tokenId) {
                try {
                  const tokenObj = await getTokenObject(t.tokenId, providerName);
                  if (tokenObj) {
                    const [sym, nm, icon] = await Promise.all([
                      tokenObj.getSymbol?.() ?? Promise.resolve(null),
                      tokenObj.getName?.() ?? Promise.resolve(null),
                      tokenObj.getIconUrl?.() ?? Promise.resolve(null),
                    ]);
                    symbol = sym;
                    name = nm;
                    iconUrl = icon;
                  }
                } catch (_) {}
              }

              return {
                ...t,
                symbol: symbol || 'CC',
                name: name || 'Canton',
                iconUrl: iconUrl || null,
              };
            }));

            pendingTransfers.value = richTransfers;

            if (richTransfers && richTransfers.length > 0) {
              showOverlay.value = true;
            } else {
              showOverlay.value = false;
            }
          }
        } else {
          showOverlay.value = false;
        }
      } catch (err) {
        error.value = true;
        errorTitle.value = t('errors.transferError');
        errorSubtitle.value = t('cantonOnboarding.errorFetchData');
        showOverlay.value = true;
      } finally {
        checkingOnboarded.value = false;
      }
    };

    const CANONICAL_STEPS = [
      'CREATE_USER',
      'MINTING_DELEGATION',
      'CC_TRANSFER_PREAPPROVAL',
    ];

    const showStepsView = ref(false);
    const onboardingSteps = ref([
      { actionType: 'CREATE_USER', status: 'pending', request: null },
      { actionType: 'MINTING_DELEGATION', status: 'pending', request: null },
      { actionType: 'CC_TRANSFER_PREAPPROVAL', status: 'pending', request: null },
    ]);

    const currentNfcTitle = ref('');
    const currentNfcSubtitle = ref('');

    const activeStepExists = computed(() => {
      return onboardingSteps.value.some((s) => s.status === 'in_progress');
    });

    const refreshOnboardingSteps = async () => {
      const keys = store.state.user.publicKeyCard;
      if (!keys) return [];
      const mgr = shallowRef(initialManager(false));
      if (typeof mgr.value === 'string' || !mgr.value) return [];
      if (typeof mgr.value.setPrimaryCard === 'function') {
        mgr.value.setPrimaryCard(keys);
      }
      const requests = await mgr.value.performOnBoarding(keys);
      const requestList = Array.isArray(requests) ? requests : [requests];

      const steps = CANONICAL_STEPS.map((type) => {
        const matchingReq = requestList.find((r) => r?.actionType === type);
        return {
          actionType: type,
          request: matchingReq || null,
          status: matchingReq ? 'pending' : 'completed',
        };
      });

      const firstPending = steps.find((s) => s.status === 'pending');
      if (firstPending) {
        firstPending.status = 'in_progress';
      }

      onboardingSteps.value = steps;
      return steps;
    };

    const openStepsView = async () => {
      error.value = false;
      isLoading.value = true;
      titleLoad.value = t('pages.send.status.wait');
      messageLoad.value = t('cantonOnboarding.statusPreparing');

      try {
        await refreshOnboardingSteps();
        showStepsView.value = true;
      } catch (err) {
        const { title, message } = await getErrorMessage(err);
        error.value = true;
        errorTitle.value = title ?? t('errors.transferError');
        errorSubtitle.value = message ?? t('cantonOnboarding.errorOccurred');
      } finally {
        isLoading.value = false;
      }
    };

    const signCurrentStep = async () => {
      error.value = false;
      const currentStep = onboardingSteps.value.find((s) => s.status === 'in_progress');
      if (!currentStep || !currentStep.request) {
        await checkCantonOnboarding();
        return;
      }

      if (store.state.user.pinHash !== null && (store.state.user.pinHash?.date - Date.now()) > 0) {
        pinPre.value = store.state.user.pinHash?.pin;
        await executeStepSignature(currentStep);
      } else {
        pinState.value = true;
      }
    };

    const executeStepSignature = async (step) => {
      if (!step || !step.request) return;

      isLoading.value = true;
      titleLoad.value = t('pages.send.status.wait');
      messageLoad.value = t('cantonOnboarding.statusPreparing');

      setUniSettings({ ioMethod: store.state.settings.cardReaderPriority === 'fido' ? 'fido' : 'nfc' });

      try {
        currentNfcTitle.value = t(`cantonOnboarding.steps.${step.actionType}.nfcTitle`);
        currentNfcSubtitle.value = t(`cantonOnboarding.steps.${step.actionType}.nfcSubTitle`);

        nfcIsActive.value = true;

        const signResult = await nfcHandlerWindow.value?.nfcProgressChunksHandler(step.request, pinPre.value, true);

        if (!signResult) {
          throw new Error(t('errors.invalidCardResponse'));
        }

        isLoading.value = true;
        messageLoad.value = t('cantonOnboarding.statusSending');

        const updateId = await step.request.send();

        step.status = 'completed';
        step.request = null;

        const nextPending = onboardingSteps.value.find((s) => s.status === 'pending');
        if (nextPending) {
          nextPending.status = 'in_progress';
        } else {
          isOnboarded.value = true;
          showStepsView.value = false;
          showOverlay.value = false;
        }

        if (pinPre.value !== null && storePin.value === true && store.state.user.pinHash === null) {
          await store.dispatch('user/setPinHash', { pin: pinPre.value, date: Date.now() + (1000 * 60 * 5) });
        }
      } catch (err) {
        const { title, message } = await getErrorMessage(err);
        error.value = true;
        errorTitle.value = title ?? t('errors.transferError');
        errorSubtitle.value = message ?? err?.cause?.errorSubtitle ?? t('cantonOnboarding.errorOccurred');
      } finally {
        isLoading.value = false;
        nfcIsActive.value = false;
        pinPre.value = null;
      }
    };

    const startProcessTransfer = async (transfer, action) => {
      activeTransfer.value = transfer;
      activeAction.value = action;
      error.value = false;

      if (store.state.user.pinHash !== null && (store.state.user.pinHash?.date - Date.now()) > 0) {
        pinPre.value = store.state.user.pinHash?.pin;
        await executeTransferAction();
      } else {
        pinState.value = true;
      }
    };

    const executeTransferAction = async () => {
      isLoading.value = true;
      titleLoad.value = t('pages.send.status.wait');
      messageLoad.value = activeAction.value === 'accept'
        ? t('cantonOnboarding.statusPreparingAccept')
        : t('cantonOnboarding.statusPreparingReject');

      setUniSettings({ ioMethod: store.state.settings.cardReaderPriority === 'fido' ? 'fido' : 'nfc' });

      try {

        const keys = store.state.user.publicKeyCard;
        const mgr = shallowRef(initialManager(false));
        if (typeof mgr.value === 'string' || !mgr.value) {
          throw new Error(typeof mgr.value === 'string' ? mgr.value : 'Manager not initialized');
        }

        if (typeof mgr.value.setPrimaryCard === 'function') {
          mgr.value.setPrimaryCard(keys);
        }

        let request;
        if (activeAction.value === 'accept') {
          request = await mgr.value.acceptTransfer({ id: activeTransfer.value.id, keys });
        } else {
          request = await mgr.value.rejectTransfer({ id: activeTransfer.value.id, keys });
        }

        nfcIsActive.value = true;

        const signResult = await nfcHandlerWindow.value?.nfcProgressChunksHandler(request, pinPre.value, true);

        if (!signResult) {
          throw new Error(t('errors.invalidCardResponse'));
        }

        isLoading.value = true;
        messageLoad.value = activeAction.value === 'accept'
          ? t('cantonOnboarding.statusSendingAccept')
          : t('cantonOnboarding.statusSendingReject');

        const updateId = await request.send();

        if (pinPre.value !== null && storePin.value === true && store.state.user.pinHash === null) {
          await store.dispatch('user/setPinHash', { pin: pinPre.value, date: Date.now() + (1000 * 60 * 5) });
        }

        await checkCantonOnboarding();
      } catch (err) {
        const { title, message } = await getErrorMessage(err);
        error.value = true;
        errorTitle.value = title ?? t('errors.transferError');
        errorSubtitle.value = message ?? err?.cause?.errorSubtitle ?? t('cantonOnboarding.errorTransferSigning');
      } finally {
        isLoading.value = false;
        nfcIsActive.value = false;
        pinPre.value = null;
        activeTransfer.value = null;
        activeAction.value = '';
      }
    };

    const updatePin = async () => {
      if (pinPre.value !== null && pinPre.value?.length === pinLength.value) {
        hashPinPre.value = await sha256(pinPre.value);
        pinState.value = false;
        if (activeTransfer.value) {
          await executeTransferAction();
        } else if (showStepsView.value) {
          const currentStep = onboardingSteps.value.find((s) => s.status === 'in_progress');
          if (currentStep) {
            await executeStepSignature(currentStep);
          }
        } else {
          await openStepsView();
        }
      }
    };

    const pinCancelButton = () => {
      pinState.value = false;
      pinPre.value = null;
      activeTransfer.value = null;
      activeAction.value = '';
    };

    const storePinHandler = (event) => {
      storePin.value = event?.value ?? event;
    };

    const changePinLength = () => {
      pinPre.value = null;
    };

    const cancelSigning = () => {
      nfcIsActive.value = false;
      pinPre.value = null;
      isLoading.value = false;
      activeTransfer.value = null;
      activeAction.value = '';
    };

    const updateCantonState = () => {
      if (isCurrentRouteExcluded()) {
        isCantonOnboardingActive.value = false;
        return;
      }
      if (!isCardRegistered()) {
        isCantonOnboardingActive.value = false;
        return;
      }

      if (showOverlay.value) {
        isCantonOnboardingActive.value = true;
      } else {
        const addr = store.state.user.accountAddress;
        if (addr && isValidWalletAddress(addr)) {
          isCantonOnboardingActive.value = false;
        } else {
          isCantonOnboardingActive.value = true;
        }
      }
    };

    watch(
      [showOverlay, () => store.state.user.accountAddress],
      () => {
        updateCantonState();
      },
      { immediate: true }
    );

    watch(
      () => store.state.settings.rpcProvider,
      async () => {
        await checkCantonOnboarding();
      }
    );

    watch(
      () => store.state.user.publicKeyCard,
      async () => {
        await checkCantonOnboarding();
      }
    );

    watch(
      () => route.path,
      async () => {
        await checkCantonOnboarding();
      }
    );

    let providerListener = null;
    let balanceListener = null;

    onMounted(async () => {
      await checkCantonOnboarding();

      providerListener = useEventsBus().on('rpcProviderChange', async () => {
        await checkCantonOnboarding();
      });

      balanceListener = useEventsBus().on('tokenBalanceUpdated', async (action) => {
        if (!isCantonProvider.value || !isOnboarded.value || checkingOnboarded.value) return;
        if (action?.provider && action.provider !== RPC_NAMES.CANTON_DEV && action.provider !== RPC_NAMES.CANTON_TEST) {
          return;
        }
        try {
          const keys = store.state.user.publicKeyCard;
          if (!keys) return;
          const mgr = shallowRef(initialManager(false));
          if (mgr.value && typeof mgr.value.getPendingTransfers === 'function') {
            const transfers = await mgr.value.getPendingTransfers(keys);
            const providerName = store.state.settings.rpcProvider?.name || RPC_NAMES.CANTON_TEST;
            const storeTokens = store.state.user?.tokenBalance?.[providerName] || [];
            const richTransfers = await Promise.all((transfers || []).map(async (t) => {
              let symbol = null;
              let name = null;
              let iconUrl = null;
              const foundInStore = storeTokens.find((st) => st?.root === t.tokenId || st?.address === t.tokenId);
              if (foundInStore) {
                symbol = foundInStore.symbol;
                name = foundInStore.name;
                iconUrl = foundInStore.iconUrl;
              }
              return {
                ...t,
                symbol: symbol || 'CC',
                name: name || 'Canton',
                iconUrl: iconUrl || null,
              };
            }));
            pendingTransfers.value = richTransfers;
            if (richTransfers && richTransfers.length > 0) {
              showOverlay.value = true;
            } else if (isOnboarded.value) {
              showOverlay.value = false;
            }
          }
        } catch (_) {}
      });
    });

    onUnmounted(() => {
      isCantonOnboardingActive.value = false;
      if (providerListener) {
        providerListener();
      }
      if (balanceListener) {
        balanceListener();
      }
    });

    return {
      showOverlay,
      checkingOnboarded,
      isOnboarded,
      showStepsView,
      onboardingSteps,
      activeStepExists,
      openStepsView,
      signCurrentStep,
      currentNfcTitle,
      currentNfcSubtitle,
      pinState,
      pinPre,
      pinLength,
      storePinHandler,
      pinCancelButton,
      updatePin,
      changePinLength,
      nfcIsActive,
      nfcHandlerWindow,
      cancelSigning,
      isLoading,
      messageLoad,
      titleLoad,
      error,
      errorTitle,
      errorSubtitle,
      errorImg,
      errorHandler,
      pendingTransfers,
      shortenAddress,
      startProcessTransfer,
      roundNumber
    };
  }
};
</script>

<style scoped lang="scss">
.container-main {
  width: 100%;
  height: 100%;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;

  &.falc {
    justify-content: center;
  }
}

.container-box {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.canton-card-modal {
  position: relative;
  width: 100%;
  max-width: 440px;
  background: $color-black-17;
  border: 1px solid rgba($color-white, 0.08);
  border-radius: 24px;
  padding: 28px 24px 24px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.7);
  box-sizing: border-box;
  text-align: center;
  margin: auto;
  overflow: hidden;
}

.onboarding-content {
  width: 100%;
  box-sizing: border-box;
}

.steps-container, .intro-container {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header-icon-wrap {
  position: relative;
  width: 96px;
  height: 96px;
  margin: 0 auto 16px auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, rgba($color-orange, 0.22) 0%, rgba($color-orange, 0.04) 70%);
  border-radius: 50%;

  .main-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: $color-orange;
    z-index: 2;

    :deep(svg) {
      width: 64px;
      height: 64px;
    }
  }
}

.steps-header {
  margin-bottom: 20px;
  width: 100%;

  .title {
    margin: 0 0 8px 0;
    font-size: 21px;
    font-weight: 700;
    color: $color-white;
  }

  .subtitle {
    margin: 0;
    font-size: 13.5px;
    color: $color-gray;
    line-height: 1.45;
  }
}

.steps-list {
  background: $color-black-10;
  border: 1px solid rgba($color-white, 0.07);
  border-radius: 16px;
  padding: 12px;
  margin-bottom: 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
  box-sizing: border-box;
  width: 100%;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba($color-white, 0.03);
  border: 1px solid rgba($color-white, 0.04);
  box-sizing: border-box;
  width: 100%;
  @include transition(background 0.2s ease, border-color 0.2s ease, transform 0.2s ease);

  &.step-active {
    background: rgba($color-white, 0.05);
    border-color: rgba($color-orange, 0.3);
  }

  &.step-completed {
    background: rgba($color-white, 0.02);
  }

  &.step-pending {
    opacity: 0.6;
  }

  .step-icon-box {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba($color-orange, 0.12);
    color: $color-orange;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg {
      width: 20px;
      height: 20px;
      stroke: currentColor;
    }
  }

  .step-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    .step-title {
      font-size: 13.5px;
      font-weight: 600;
      color: $color-white;
      line-height: 1.3;
    }

    .step-desc {
      font-size: 11.5px;
      color: $color-gray;
      line-height: 1.3;
    }
  }

  .step-badge {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    .badge-indicator {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      @include transition(all 0.2s ease);

      &.completed {
        background: rgba($color-green, 0.15);
        color: $color-green;
        border: 1px solid rgba($color-green, 0.4);

        svg {
          width: 11px;
          height: 11px;
          stroke: $color-green;
        }
      }

      &.in_progress {
        background: rgba($color-orange, 0.15);
        color: $color-orange;
        border: 1px solid rgba($color-orange, 0.4);
      }

      &.pending {
        background: rgba($color-white, 0.06);
        color: $color-gray;
        border: 1px solid rgba($color-white, 0.1);
      }
    }
  }
}

.steps-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;

  :deep(.button) {
    width: 100%;
  }
}

.transfers-list {
  width: 100%;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 6px;
  box-sizing: border-box;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
  }
}

.transfer-item {
  background: rgba($color-white, 0.03);
  border: 1px solid rgba($color-white, 0.08);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  box-sizing: border-box;
  @include transition(all 0.2s ease);

  &:hover {
    background: rgba($color-white, 0.05);
    border-color: rgba($color-white, 0.12);
  }
}

.transfer-info {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.transfer-label-group {
  display: flex;
  flex-direction: row;
  width: 100%;
}

.transfer-sender {
  font-size: 14px;
  color: $color-gray;
  display: flex;
  flex-direction: row;
  gap: 4px;

  .sender-addr {
    color: $color-white;
    margin-left: 5px;
    font-size: 15px;
    font-weight: 600;
    word-break: break-all;
  }
}

.transfer-token-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-top: 10px;
  border-top: 1px solid rgba($color-white, 0.06);
}

.transfer-token-badge {
  display: flex;
  align-items: center;
  gap: 10px;
}

.transfer-token-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  :deep(.icon) {
    width: 32px;
    height: 32px;
  }
}

.transfer-token-names {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.token-symbol {
  font-size: 14px;
  font-weight: 600;
  color: $color-white;
}

.token-name {
  font-size: 12px;
  color: $color-gray;
}

.transfer-amount {
  font-size: 18px;
  font-weight: 700;
  color: $color-white;
}

.transfer-actions {
  width: 100%;
  display: flex;
  gap: 12px;
}
</style>
