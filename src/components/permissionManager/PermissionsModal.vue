<template>
  <Teleport to="body">
    <Transition name="perm-fade">
      <div v-if="isVisible" class="permissions-backdrop" @click="dismiss">
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
                clickable: permissionStatuses[item.id] !== 'granted',
                granted: permissionStatuses[item.id] === 'granted',
                'denied-selected': selectedBlockedPermId === item.id && permissionStatuses[item.id] === 'denied'
              }"
              @click="requestItem(item)"
            >
              <div class="item-icon-box">
                <component :is="item.iconComponent" v-if="item.iconComponent" />
                <template v-else>
                  <svg v-if="item.id === 'notifications'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <svg v-else-if="item.id === 'audio'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                  <svg v-else-if="item.id === 'camera'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
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
                <span class="item-title">{{ t(item.titleKey) }}</span>
                <span class="item-desc">{{ t(item.descriptionKey) }}</span>
              </div>
              <div class="item-badge">
                <span
                  class="badge-indicator"
                  :class="permissionStatuses[item.id] || 'prompt'"
                  :title="permissionStatuses[item.id]"
                >
                  <svg v-if="permissionStatuses[item.id] === 'granted'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <svg v-else-if="permissionStatuses[item.id] === 'denied'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </span>
              </div>
            </div>
          </div>

          <div v-if="hasBlockedPermission" class="blocked-notice">
            <div class="notice-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p class="notice-text">{{ currentBlockedHint }}</p>
          </div>

          <div class="permissions-actions">
            <Button
              button-type="main"
              button-round="round12"
              :button-name="t('permissions.enableAll')"
              :is-loading="isLoading"
              @onClick="enableAll"
            />
            <Button
              button-type="second"
              button-round="round12"
              :button-name="t('permissions.notNow')"
              :is-disabled="isLoading"
              @onClick="dismiss"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from '@/components/Button.vue';
import { permissionManager } from './PermissionManager';
import { useEventsBus } from '@/plugins/eventBus';
import { PermissionItem, PermissionStatus } from './types';

const { t, te } = useI18n();

const isVisible = permissionManager.isModalVisible;
const supportedPermissions = permissionManager.getSupportedPermissions();
const isLoading = ref(false);
const permissionStatuses = ref<Record<string, PermissionStatus>>({});
const selectedBlockedPermId = ref<string | null>(null);

const hasBlockedPermission = computed(() => {
  return Object.values(permissionStatuses.value).some(status => status === 'denied');
});

const currentBlockedHint = computed(() => {
  if (selectedBlockedPermId.value && permissionStatuses.value[selectedBlockedPermId.value] === 'denied') {
    const specificKey = `permissions.blockedHint_${selectedBlockedPermId.value}`;
    if (te(specificKey)) {
      return t(specificKey);
    }
  }
  return t('permissions.blockedHintGeneral');
});

const { on } = useEventsBus();

const updateStatuses = async () => {
  permissionStatuses.value = await permissionManager.getPermissionStatuses();
};

onMounted(async () => {
  await updateStatuses();
  const shouldPrompt = await permissionManager.shouldShowPrompt();
  if (shouldPrompt) {
    permissionManager.prompt();
  }
});

on('promptPermissionsModal', async () => {
  await updateStatuses();
  permissionManager.prompt();
});

on('promptPushPermission', async () => {
  await updateStatuses();
  permissionManager.prompt();
});

on('permissionsUpdated', async () => {
  await updateStatuses();
});

async function requestItem(item: PermissionItem) {
  if (permissionStatuses.value[item.id] === 'denied') {
    selectedBlockedPermId.value = item.id;
  }
  if (permissionStatuses.value[item.id] === 'granted' || isLoading.value) return;
  isLoading.value = true;
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
    isLoading.value = false;
  }
}

async function enableAll() {
  isLoading.value = true;
  try {
    await permissionManager.requestAll();
    await updateStatuses();
  } finally {
    isLoading.value = false;
  }
}

function dismiss() {
  permissionManager.dismiss();
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
  padding: 30px 24px 24px;
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
  margin-bottom: 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
  max-height: 260px;
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

  &.denied-selected {
    border-color: rgba($color-red, 0.5);
    background: rgba($color-red, 0.08);
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
    gap: 2px;
    min-width: 0;

    .item-title {
      font-size: 13.5px;
      font-weight: 600;
      color: $color-white;
    }

    .item-desc {
      font-size: 11.5px;
      color: $color-gray;
      line-height: 1.3;
      white-space: wrap;
      overflow: hidden;
      text-overflow: ellipsis;
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

      &.denied {
        background: rgba($color-red, 0.15);
        color: $color-red;
        border: 1px solid rgba($color-red, 0.4);

        svg {
          width: 10px;
          height: 10px;
          stroke: $color-red;
        }
      }

      &.prompt,
      &.unsupported {
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
