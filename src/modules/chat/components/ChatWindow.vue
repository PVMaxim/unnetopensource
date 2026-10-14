<template>
  <div class="chat-window">
    <div class="chat-window__header">
      <div class="chat-header-left">
        <span class="chat-dot" :class="dotClass"></span>
        <span class="chat-status-text">{{ statusText }}</span>
      </div>
      <button
        class="chat-reset-btn"
        :disabled="!sdkReady"
        @click="handleReset"
      >
        {{ $t('chat.reset') }}
      </button>
    </div>

    <div class="chat-window__messages" ref="messagesContainer">
      <div v-if="sdkLoading" class="chat-window__loading">
        <div class="chat-spinner"></div>
        <span class="chat-loading-label">{{ $t('chat.loadingAssistant') }}</span>
      </div>
      <template v-else>
        <ChatMessage
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
          @confirmSend="handleConfirmSend"
          @declineSend="handleDeclineSend"
        />
      </template>
    </div>

    <div class="chat-window__input">
      <input
        ref="chatInput"
        v-model="inputText"
        :disabled="!sdkReady"
        :placeholder="sdkReady ? $t('chat.placeholder') : $t('chat.placeholderLoading')"
        autocomplete="off"
        @keydown.enter.prevent="handleSend"
      />
      <button
        class="chat-send-btn"
        :disabled="!sdkReady || !inputText.trim()"
        @click="handleSend"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import ChatMessage from './ChatMessage.vue';
import {
  initIntentSdk,
  processMessage,
  resetConversation,
  isSdkReady,
} from '@/modules/chat/api/intentSdk';
import { executeAction } from '@/modules/chat/api/actionHandler';
import { rpcList } from '@/api/constants-types';
import { getWallet } from '@/api/ApiHandler';
import { useEventsBus } from '@/plugins/eventBus.js';
import { runApplicationChecks } from '@/api/updatesChainResponsability';

const NETWORK_ALIASES = {
  ethereum: 'Ethereum', eth: 'Ethereum',
  bnb: 'BNB Chain', bsc: 'BNB Chain', binance: 'BNB Chain',
  polygon: 'Polygon', matic: 'Polygon',
  arbitrum: 'Arbitrum', base: 'Base',
  avalanche: 'Avalanche', avax: 'Avalanche',
  solana: 'Solana', sol: 'Solana',
  bitcoin: 'Bitcoin', btc: 'Bitcoin',
  tron: 'Tron', trx: 'Tron',
  ton: 'Ton', venom: 'Venom',
  xrp: 'Xrp', ripple: 'Xrp',
  coti: 'Coti', katana: 'Katana',
};

function resolveRpcProvider(network) {
  if (!network) return null;
  const lower = network.toLowerCase();
  const targetName =
    rpcList.find((r) => r.name.toLowerCase() === lower)?.name ??
    NETWORK_ALIASES[lower];
  return rpcList.find((r) => r.name === targetName) ?? null;
}

export default {
  name: 'ChatWindow',
  components: { ChatMessage },
  setup() {
    const store = useStore();
    const router = useRouter();
    const { t } = useI18n();
    const inputText = ref('');
    const messagesContainer = ref(null);
    const chatInput = ref(null);

    const messages = computed(() => store.state.chat.messages);
    const sdkReady = computed(() => store.state.chat.sdkReady);
    const sdkLoading = computed(() => store.state.chat.sdkLoading);

    const dotClass = computed(() => {
      if (sdkLoading.value) return 'chat-dot--loading';
      if (sdkReady.value) return 'chat-dot--ready';
      return 'chat-dot--error';
    });

    const statusText = computed(() => {
      if (sdkLoading.value) return t('chat.status.loading');
      if (sdkReady.value) return t('chat.status.ready');
      return t('chat.status.error');
    });

    function scrollToBottom() {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
      });
    }

    watch(messages, scrollToBottom, { deep: true });

    async function loadSdk() {
      store.dispatch('chat/setSdkLoading', true);
      try {
        await initIntentSdk();
        store.dispatch('chat/setSdkReady', true);

        if (messages.value.length === 0) {
          store.dispatch('chat/addMessage', {
            role: 'assistant',
            text: t('chat.welcomeMessage'),
          });
        }
      } catch (e) {
        console.error('Failed to load IntentSdk:', e);
        store.dispatch('chat/addMessage', {
          role: 'system',
          text: t('chat.loadFailed'),
        });
      } finally {
        store.dispatch('chat/setSdkLoading', false);
      }
    }

    const INTENT_LABELS = {
      send_funds: 'send funds',
      show_balance: 'show your balance',
      swap_token: 'swap tokens',
      bridge_token: 'bridge tokens',
      receive_funds: 'receive funds',
      show_history: 'show transaction history',
      switch_wallet: 'switch wallet',
      show_wallets: 'show your wallets',
      create_new_seed_phrase: 'create a new seed phrase',
      save_alias: 'save an alias',
      delete_alias: 'delete an alias',
      get_alias: 'get an alias',
    };

    function getDisplayText(result) {
      if (result.status === 'InProgress') {
        const text = result.clarification_text ?? result.clarificationText;
        if (text) return text;
        // Fallback: build a question from intent + missing entities
        const missing = result.missing ?? [];
        const action = INTENT_LABELS[result.intent] ?? result.intent ?? 'do that';
        if (missing.length > 0) {
          return `To ${action}, I need a bit more info: ${missing.join(', ')}.`;
        }
        return `To ${action}, could you provide more details?`;
      }
      if (result.status === 'Failed') {
        const lastMsg = result.last_system_message ?? result.lastSystemMessage;
        return (
          lastMsg?.clarification_text ??
          lastMsg?.clarificationText ??
          "I didn't catch that. Could you try again?"
        );
      }
      if (result.status === 'Done') {
        if (result.kb_answer ?? result.kbAnswer) {
          return (result.kb_answer ?? result.kbAnswer).answer;
        }
        return (
          result.clarification_text ??
          result.clarificationText ??
          "Done."
        );
      }
      return "I didn't understand that.";
    }

    async function handleSend() {
      const text = inputText.value.trim();
      if (!text || !sdkReady.value) return;

      inputText.value = '';
      store.dispatch('chat/addMessage', { role: 'user', text });

      let result;
      try {
        result = processMessage(text);
        console.log('[Chat SDK] raw result:', JSON.stringify(result, null, 2));
      } catch (e) {
        console.error('SDK process error:', e);
        store.dispatch('chat/addMessage', {
          role: 'system',
          text: 'Something went wrong. Please try again.',
        });
        nextTick(() => chatInput.value?.focus());
        return;
      }

      const displayText = getDisplayText(result);
      const isDomain =
        result.status === 'Done' &&
        (result.intent_type === 'domain' || result.intentType === 'domain');

      // Show "fetching..." placeholder for show_balance while we fetch live data
      const isBalance = isDomain && result.intent === 'show_balance';
      if (isBalance) {
        store.dispatch('chat/addMessage', {
          role: 'system',
          text: 'Fetching balances...',
        });
      }

      const messagePayload = {
        role: 'assistant',
        text: displayText,
        sdkResult: result,
      };

      if (isDomain) {
        try {
          const action = await executeAction(result);

          if (action.type === 'show_balance') {
            messagePayload.balanceData = action.data;
            if (!messagePayload.text) {
              const groups = action.data.groups;
              if (groups.length === 0) {
                messagePayload.text = action.data.notice ?? 'No balances to show.';
              } else if (groups.length === 1) {
                messagePayload.text = `Here's your balance on ${groups[0].provider}:`;
              } else {
                messagePayload.text = `Found balances across ${groups.length} networks:`;
              }
            }
          } else if (action.type === 'send_prepare') {
            messagePayload.sendData = action.data;
            messagePayload.sendConfirmed = false;
            messagePayload.sendDeclined = false;
            if (!messagePayload.text) {
              const s = action.data;
              messagePayload.text = `Send ${s.amount} ${s.currency.toUpperCase()} to ${s.toAccount} on ${s.network}?`;
            }
          } else if (action.type === 'unsupported') {
            messagePayload.text =
              (displayText ?? '') +
              `\n\nThis action (${action.intent}) is not yet available in the chat.`;
          }
        } catch (e) {
          console.error('Action execution error:', e);
          messagePayload.text = `Failed to execute action: ${e.message ?? e}`;
        }
      }

      store.dispatch('chat/addMessage', messagePayload);
      nextTick(() => chatInput.value?.focus());
    }

    async function handleConfirmSend(message) {
      store.commit('chat/SET_MESSAGE_SEND_CONFIRMED', { id: message.id });

      const { amount, currency, toAccount, network } = message.sendData;

      // Switch network in store before navigation (mirrors Header.vue handleRpcChange)
      const provider = resolveRpcProvider(network);
      if (provider && provider.name !== store.state.settings.rpcProvider?.name) {
        await store.dispatch('settings/setRpcProvider', provider);

        try {
          const accountAddress = await getWallet(store.state.user.publicKeyCard, true);
          await store.dispatch('user/setAccountAddress', accountAddress);
        } catch (err) {
          console.error('[Chat] Failed to update wallet address after RPC change:', err);
        }

        useEventsBus().emit('rpcProviderChange', true);
        runApplicationChecks();
      }

      // Find token by symbol in user's balance for the target provider
      if (provider) {
        const tokens = store.state.user.tokenBalance?.[provider.name] ?? [];
        const upperSymbol = currency.toUpperCase();
        const token = tokens.find((t) => t?.symbol?.toUpperCase() === upperSymbol);
        if (token) {
          await store.dispatch('user/setSelectedToken', {
            key: provider.name,
            value: token,
          });
        }
      }

      router.push({
        name: 'send',
        query: {
          chatAmount: amount,
          chatCurrency: currency,
          chatTo: toAccount,
          chatNetwork: network,
        },
      });
    }

    function handleDeclineSend(message) {
      store.commit('chat/SET_MESSAGE_SEND_DECLINED', { id: message.id });
      store.dispatch('chat/addMessage', {
        role: 'assistant',
        text: 'Transaction cancelled. Is there anything else I can help with?',
      });
    }

    function handleReset() {
      resetConversation();
      store.dispatch('chat/clearMessages');
      store.dispatch('chat/addMessage', {
        role: 'assistant',
        text: 'Conversation reset. How can I help you?',
      });
    }

    onMounted(() => {
      if (!isSdkReady()) {
        loadSdk();
      }
      nextTick(() => chatInput.value?.focus());
    });

    return {
      inputText,
      messagesContainer,
      chatInput,
      messages,
      sdkReady,
      sdkLoading,
      dotClass,
      statusText,
      handleSend,
      handleConfirmSend,
      handleDeclineSend,
      handleReset,
    };
  },
};
</script>

<style scoped lang="scss">
.chat-window {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid $color-black-40;
    flex-shrink: 0;

    .chat-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .chat-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;

      &--loading {
        background: #f59e0b;
        animation: pulse 1.2s ease-in-out infinite;
      }

      &--ready {
        background: #22c55e;
      }

      &--error {
        background: #ef4444;
      }
    }

    .chat-status-text {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.5);
    }

    .chat-reset-btn {
      background: none;
      border: 1px solid $color-black-40;
      color: rgba(255, 255, 255, 0.4);
      padding: 5px 13px;
      border-radius: 7px;
      cursor: pointer;
      font-size: 12px;
      transition: border-color 0.15s, color 0.15s;

      &:not(:disabled):active {
        border-color: rgba(255, 255, 255, 0.3);
        color: rgba(255, 255, 255, 0.8);
      }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
    }
  }

  &__messages {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
    }
  }

  &__loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;

    .chat-spinner {
      width: 32px;
      height: 32px;
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-top-color: rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    .chat-loading-label {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.4);
    }
  }

  &__input {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid $color-black-40;
    flex-shrink: 0;

    input {
      flex: 1;
      background: $color-black-23;
      border: 1px solid $color-black-40;
      color: #e0e0e0;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.15s;

      &:focus {
        border-color: rgba(255, 255, 255, 0.2);
      }

      &:disabled {
        opacity: 0.35;
      }

      &::placeholder {
        color: rgba(255, 255, 255, 0.3);
      }
    }

    .chat-send-btn {
      background: #1d4ed8;
      border: none;
      color: #fff;
      width: 42px;
      height: 42px;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s;

      &:not(:disabled):active {
        background: #1e40af;
      }

      &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
    }
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
