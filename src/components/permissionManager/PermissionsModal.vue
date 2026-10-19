<template>
  <Teleport to="body">
    <Transition name="perm-fade">
      <div v-if="isVisible" class="permissions-backdrop" @click="handleBackdropClick" @keydown.esc="dismiss">
        <div class="permissions-card" @click.stop>
          <button class="close-btn" @click="dismiss" aria-label="Close">✕</button>

          <div class="header-icon-wrap">
            <div class="icon-ring"></div>
            <div class="main-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          </div>

          <div class="permissions-header">
            <h3 class="title">{{ t('permissions.title') }}</h3>
            <p class="subtitle">{{ t('permissions.subtitle') }}</p>
          </div>

          <div class="permissions-list">
            <div
              v-for="item in supportedPermissions"
              :key="item.id"
              class="permission-item"
              :class="{
                clickable: permissionStatuses[item.id] === 'prompt' && !loadingItems[item.id],
                granted: permissionStatuses[item.id] === 'granted',
                unsupported: permissionStatuses[item.id] === 'unsupported',
                denied: permissionStatuses[item.id] === 'denied',
                'denied-selected': activeNoticePermId === item.id,
                loading: loadingItems[item.id]
              }"
              @click="requestItem(item)"
            >
              <div class="item-icon-box">
                <component :is="item.iconComponent" v-if="item.iconComponent" />
                <template v-else>
                  <svg v-if="item.id === 'camera'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <svg v-else-if="item.id === 'nfc'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <rect x="9" y="9" width="6" height="6" />
                    <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
                  </svg>
                  <svg v-else-if="item.id === 'clipboard'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    <path d="M9 14l2 2 4-4" />
                  </svg>
                  <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </template>
              </div>

              <div class="item-text">
                <div class="item-title-row">
                  <span class="item-title">{{ t(item.titleKey) }}</span>
                  <span
                    v-if="permissionStatuses[item.id] === 'unsupported'"
                    class="item-status-tag unsupported"
                  >
                    {{ t('permissions.statusUnsupported') }}
                  </span>
                  <span
                    v-else-if="permissionStatuses[item.id] === 'denied'"
                    class="item-status-tag denied"
                  >
                    {{ t('permissions.statusDenied') }}
                  </span>
                </div>
                <span
                  class="item-desc"
                  :class="{
                    'status-reason-unsupported': permissionStatuses[item.id] === 'unsupported',
                    'status-reason-denied': permissionStatuses[item.id] === 'denied'
                  }"
                >
                  {{ getItemDescription(item) }}
                </span>
              </div>

              <div class="item-badge">
                <div v-if="loadingItems[item.id]" class="spinner-small"></div>
                <span
                  v-else
                  class="badge-indicator"
                  :class="permissionStatuses[item.id] || 'prompt'"
                  :title="permissionStatuses[item.id]"
                >
                  <!-- Granted: green checkmark -->
                  <svg v-if="permissionStatuses[item.id] === 'granted'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <!-- Denied or Unsupported: red cross -->
                  <svg v-else-if="permissionStatuses[item.id] === 'denied' || permissionStatuses[item.id] === 'unsupported'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <!-- Prompt: orange question mark -->
                  <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </span>
              </div>
            </div>
          </div>

          <div v-if="hasNotice" class="blocked-notice">
            <div class="notice-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p class="notice-text">{{ currentNoticeHint }}</p>
          </div>

          <div class="permissions-actions">
            <Button
              v-if="hasPromptPermissions"
              button-type="main"
              button-round="round12"
              :button-name="t('permissions.enableAll')"
              :is-loading="isAllLoading"
              @onClick="enableAll"
            />
            <Button
              button-type="second"
              button-round="round12"
              :button-name="t('permissions.notNow')"
              :is-disabled="isAllLoading"
              @onClick="dismiss"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from '@/components/Button.vue';
import { permissionManager } from './PermissionManager';
import { useEventsBus } from '@/plugins/eventBus';
import { PermissionItem, PermissionStatus } from './types';

const { t, te } = useI18n();

const isVisible = permissionManager.isModalVisible;
const supportedPermissions = permissionManager.getSupportedPermissions();
const isAllLoading = ref(false);
const loadingItems = reactive<Record<string, boolean>>({});
const permissionStatuses = ref<Record<string, PermissionStatus>>({});
const selectedBlockedPermId = ref<string | null>(null);

const hasNotice = computed(() => {
  return Object.values(permissionStatuses.value).some(status => status === 'denied' || status === 'unsupported');
});

const activeNoticePermId = computed(() => {
  if (selectedBlockedPermId.value && (permissionStatuses.value[selectedBlockedPermId.value] === 'denied' || permissionStatuses.value[selectedBlockedPermId.value] === 'unsupported')) {
    return selectedBlockedPermId.value;
  }
  const firstProblem = supportedPermissions.value.find(p => {
    const s = permissionStatuses.value[p.id];
    return s === 'denied' || s === 'unsupported';
  });
  return firstProblem?.id || null;
});

const currentNoticeHint = computed(() => {
  const activeId = activeNoticePermId.value;
  if (activeId) {
    const status = permissionStatuses.value[activeId];
    if (status === 'unsupported') {
      const specificUnsupported = `permissions.blockedHint_${activeId}_unsupported`;
      if (te(specificUnsupported)) return t(specificUnsupported);
    }
    const specificBlocked = `permissions.blockedHint_${activeId}`;
    if (te(specificBlocked)) return t(specificBlocked);
  }
  return t('permissions.blockedHintGeneral');
});

const getItemDescription = (item: PermissionItem) => {
  const status = permissionStatuses.value[item.id];
  if (status === 'unsupported') {
    const key = `permissions.unsupported_${item.id}`;
    return te(key) ? t(key) : t('permissions.statusUnsupported');
  }
  if (status === 'denied') {
    return t('permissions.deniedReason');
  }
  return t(item.descriptionKey);
};

const hasPromptPermissions = computed(() => {
  return supportedPermissions.value.some(perm => {
    const s = permissionStatuses.value[perm.id];
    return s === 'prompt';
  });
});

const { on } = useEventsBus();

const updateStatuses = async () => {
  permissionStatuses.value = await permissionManager.getPermissionStatuses();
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isVisible.value) {
    dismiss();
  }
};

onMounted(async () => {
  window.addEventListener('keydown', handleKeyDown);
  await updateStatuses();
  const shouldPrompt = await permissionManager.shouldShowPrompt();
  if (shouldPrompt) {
    permissionManager.prompt();
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

on('promptPermissionsModal', async () => {
  await updateStatuses();
  permissionManager.prompt(true);
});


on('permissionsUpdated', async () => {
  await updateStatuses();
});

async function requestItem(item: PermissionItem) {
  if (permissionStatuses.value[item.id] === 'denied' || permissionStatuses.value[item.id] === 'unsupported') {
    selectedBlockedPermId.value = item.id;
    return;
  }
  if (permissionStatuses.value[item.id] === 'granted' || loadingItems[item.id] || isAllLoading.value) return;

  loadingItems[item.id] = true;
  try {
    await permissionManager.requestSingle(item.id);
    await updateStatuses();
    if (permissionStatuses.value[item.id] === 'denied') {
      selectedBlockedPermId.value = item.id;
    } else if (selectedBlockedPermId.value === item.id) {
      selectedBlockedPermId.value = null;
    }
    const shouldPrompt = await permissionManager.shouldShowPrompt();
    if (!shouldPrompt) {
      permissionManager.dismiss();
    }
  } finally {
    loadingItems[item.id] = false;
  }
}

async function enableAll() {
  isAllLoading.value = true;
  try {
    await permissionManager.requestAll();
    await updateStatuses();
  } finally {
    isAllLoading.value = false;
  }
}

function handleBackdropClick() {
  dismiss();
}

function dismiss() {
  permissionManager.dismiss(false);
}
</script>

<style scoped lang="scss">
.permissions-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba($color-black-10, 0.78);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 16px;
  box-sizing: border-box;
}

.permissions-card {
  position: relative;
  background: linear-gradient(150deg, $color-black-24 0%, $color-black-17 100%);
  border: 1px solid rgba($color-white, 0.12);
  border-radius: 24px;
  padding: 30px 24px 20px;
  max-width: 440px;
  width: 100%;
  color: $color-white;
  box-shadow: 0 24px 60px rgba($color-black-10, 0.7), 0 0 35px rgba($color-orange, 0.08);
  text-align: center;
  box-sizing: border-box;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  color: $color-gray;
  font-size: 16px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 50%;
  @include transition(color 0.2s ease, background 0.2s ease);

  &:hover {
    color: $color-white;
    background: rgba($color-white, 0.1);
  }
}

.header-icon-wrap {
  position: relative;
  width: 64px;
  height: 64px;
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
  }

  .icon-ring {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 50%;
    border: 2px solid rgba($color-orange, 0.35);
    animation: permPulseRing 2.2s infinite ease-out;
  }
}

.permissions-header {
  margin-bottom: 20px;

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

.permissions-list {
  background: $color-black-10;
  border: 1px solid rgba($color-white, 0.07);
  border-radius: 16px;
  padding: 12px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
  max-height: 280px;
  overflow-y: auto;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba($color-white, 0.03);
  border: 1px solid rgba($color-white, 0.04);
  @include transition(background 0.2s ease, border-color 0.2s ease, transform 0.2s ease);

  &.clickable {
    cursor: pointer;

    &:hover {
      background: rgba($color-white, 0.07);
      border-color: rgba($color-orange, 0.3);
      @include transforma(translateY(-1px));
    }

    &:active {
      @include transforma(scale(0.99));
    }
  }

  &.granted {
    cursor: default;
    background: rgba($color-white, 0.02);
  }

  &.unsupported {
    background: rgba($color-white, 0.02);
    border-color: rgba($color-red, 0.18);
  }

  &.denied-selected {
    border-color: rgba($color-red, 0.5);
    background: rgba($color-red, 0.08);
  }

  &.loading {
    opacity: 0.7;
    pointer-events: none;
  }

  .item-icon-box {
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

  .item-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;

    .item-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .item-title {
      font-size: 13.5px;
      font-weight: 600;
      color: $color-white;
    }

    .item-status-tag {
      font-size: 10px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 6px;
      line-height: 1.3;
      letter-spacing: 0.3px;
      text-transform: uppercase;

      &.unsupported {
        background: rgba($color-red, 0.15);
        color: #f87171;
        border: 1px solid rgba($color-red, 0.3);
      }

      &.denied {
        background: rgba($color-red, 0.18);
        color: #ef4444;
        border: 1px solid rgba($color-red, 0.4);
      }
    }

    .item-desc {
      font-size: 11.5px;
      color: $color-gray;
      line-height: 1.35;
      white-space: wrap;
      overflow: hidden;
      text-overflow: ellipsis;

      &.status-reason-unsupported {
        color: rgba(#f87171, 0.95);
      }

      &.status-reason-denied {
        color: rgba(#ef4444, 0.95);
      }
    }
  }

  .item-badge {
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

      &.granted {
        background: rgba($color-green, 0.15);
        color: $color-green;
        border: 1px solid rgba($color-green, 0.4);

        svg {
          width: 11px;
          height: 11px;
          stroke: $color-green;
        }
      }

      &.denied,
      &.unsupported {
        background: rgba($color-red, 0.15);
        color: $color-red;
        border: 1px solid rgba($color-red, 0.4);

        svg {
          width: 10px;
          height: 10px;
          stroke: $color-red;
        }
      }

      &.prompt {
        background: rgba($color-orange, 0.15);
        color: $color-orange;
        border: 1px solid rgba($color-orange, 0.4);

        svg {
          width: 11px;
          height: 11px;
          stroke: $color-orange;
        }
      }
    }
  }
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba($color-orange, 0.25);
  border-top-color: $color-orange;
  border-radius: 50%;
  animation: permSpin 0.7s linear infinite;
}

@keyframes permSpin {
  to { transform: rotate(360deg); }
}

.blocked-notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba($color-orange, 0.1);
  border: 1px solid rgba($color-orange, 0.25);
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 18px;
  text-align: left;

  .notice-icon {
    color: $color-orange;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .notice-text {
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
    color: rgba($color-white, 0.85);
  }
}

.permissions-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;

  :deep(.button) {
    width: 100%;
    max-width: 100%;
    height: 46px;
    font-size: 15px;
    font-weight: 600;
  }
}

@keyframes permPulseRing {
  0% { transform: scale(0.9); opacity: 0.8; }
  100% { transform: scale(1.4); opacity: 0; }
}

.perm-fade-enter-active,
.perm-fade-leave-active {
  @include transition(opacity 0.25s ease);

  .permissions-card {
    @include transition(transform 0.25s cubic-bezier(0.16, 1, 0.3, 1));
  }
}

.perm-fade-enter-from,
.perm-fade-leave-to {
  opacity: 0;

  .permissions-card {
    @include transforma(scale(0.92));
  }
}
</style>
