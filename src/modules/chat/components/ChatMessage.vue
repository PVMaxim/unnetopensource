<template>
  <div class="chat-message" :class="[`chat-message--${message.role}`]">
    <div class="chat-message__bubble">
      <template v-if="message.role === 'user'">
        <span class="chat-message__text">{{ message.text }}</span>
      </template>

      <template v-else-if="message.role === 'assistant'">
        <span v-if="message.text" class="chat-message__text">{{ message.text }}</span>

        <div v-if="message.balanceData" class="chat-message__balance">
          <div
            v-for="group in message.balanceData.groups"
            :key="group.provider"
            class="balance-group"
          >
            <div class="balance-header">
              <span class="balance-provider">{{ group.provider }}</span>
            </div>
            <div v-if="group.tokens.length > 0" class="balance-list">
              <div
                v-for="token in group.tokens"
                :key="token.symbol"
                class="balance-item"
              >
                <span class="balance-symbol">{{ token.symbol }}</span>
                <div class="balance-values">
                  <span class="balance-amount">{{ token.balance }}</span>
                  <span class="balance-usd">${{ token.usdBalance }}</span>
                </div>
              </div>
            </div>
            <div v-else class="balance-empty">{{ $t('chat.noTokens') }}</div>
          </div>
          <div v-if="message.balanceData.notice" class="balance-notice">
            {{ message.balanceData.notice }}
          </div>
        </div>

        <div v-if="message.sendData" class="chat-message__send-confirm">
          <div class="send-details">
            <div class="send-row">
              <span class="send-label">{{ $t('chat.amountLabel') }}</span>
              <span class="send-value">{{ message.sendData.amount }} {{ message.sendData.currency }}</span>
            </div>
            <div class="send-row">
              <span class="send-label">{{ $t('chat.toLabel') }}</span>
              <span class="send-value send-address">{{ message.sendData.toAccount }}</span>
            </div>
            <div class="send-row">
              <span class="send-label">{{ $t('chat.networkLabel') }}</span>
              <span class="send-value">{{ message.sendData.network }}</span>
            </div>
          </div>
          <div v-if="!message.sendConfirmed && !message.sendDeclined" class="send-actions">
            <button class="btn-confirm" @click="$emit('confirmSend', message)">{{ $t('chat.confirm') }}</button>
            <button class="btn-cancel" @click="$emit('declineSend', message)">{{ $t('chat.cancel') }}</button>
          </div>
          <div v-else-if="message.sendConfirmed" class="send-status send-status--confirmed">
            {{ $t('chat.redirectingToSend') }}
          </div>
          <div v-else class="send-status send-status--declined">
            {{ $t('chat.cancelled') }}
          </div>
        </div>
      </template>

      <template v-else-if="message.role === 'system'">
        <span class="chat-message__text chat-message__text--system">{{ message.text }}</span>
      </template>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChatMessage',
  props: {
    message: {
      type: Object,
      required: true,
    },
  },
  emits: ['confirmSend', 'declineSend'],
};
</script>

<style scoped lang="scss">
.chat-message {
  display: flex;
  width: 100%;
  margin-bottom: 12px;
  user-select: text !important;
  -webkit-user-select: text !important;

  * {
    user-select: text !important;
    -webkit-user-select: text !important;
  }

  &--user {
    justify-content: flex-end;
  }

  &--assistant,
  &--system {
    justify-content: flex-start;
  }

  &__bubble {
    max-width: 85%;
    padding: 10px 14px;
    border-radius: 16px;
    font-size: 14px;
    line-height: 1.4;
    word-break: break-word;
  }

  &--user &__bubble {
    background: #1d4ed8;
    color: #fff;
    border-bottom-right-radius: 4px;
  }

  &--assistant &__bubble {
    background: $color-black-23;
    border: 1px solid $color-black-40;
    color: #e0e0e0;
    border-bottom-left-radius: 4px;
  }

  &--system &__bubble {
    background: transparent;
    border: none;
    padding: 4px 8px;
  }

  &__text {
    white-space: pre-wrap;

    &--system {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.4);
      font-style: italic;
    }
  }

  &__balance {
    margin-top: 8px;

    .balance-group + .balance-group {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid $color-black-40;
    }

    .balance-notice {
      margin-top: 10px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      font-style: italic;
    }

    .balance-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid $color-black-40;
      margin-bottom: 8px;
    }

    .balance-provider {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .balance-total {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
    }

    .balance-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .balance-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
    }

    .balance-symbol {
      font-size: 13px;
      font-weight: 500;
      color: #e0e0e0;
    }

    .balance-values {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .balance-amount {
      font-size: 13px;
      color: #fff;
    }

    .balance-usd {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
    }

    .balance-empty {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.4);
      text-align: center;
      padding: 8px 0;
    }
  }

  &__send-confirm {
    margin-top: 8px;

    .send-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-bottom: 10px;
      border-bottom: 1px solid $color-black-40;
    }

    .send-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .send-label {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }

    .send-value {
      font-size: 13px;
      color: #fff;
      font-weight: 500;
    }

    .send-address {
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .send-actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;

      button {
        flex: 1;
        padding: 8px 16px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        border: none;
      }

      .btn-confirm {
        background: #22c55e;
        color: #fff;

        &:active {
          background: #16a34a;
        }
      }

      .btn-cancel {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.7);
        border: 1px solid $color-black-40;

        &:active {
          background: rgba(255, 255, 255, 0.15);
        }
      }
    }

    .send-status {
      margin-top: 10px;
      font-size: 12px;
      text-align: center;
      padding: 6px;
      border-radius: 8px;

      &--confirmed {
        color: #4ade80;
        background: rgba(34, 197, 94, 0.1);
      }

      &--declined {
        color: #f87171;
        background: rgba(248, 113, 113, 0.1);
      }
    }
  }
}
</style>
