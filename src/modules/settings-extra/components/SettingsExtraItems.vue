<template>
  <div v-if="showNfc" class="changeSettings" @click.prevent="$emit('openNfcSettings')">
    {{ $t('pages.settings.changeNFCSettings') }}
    <narrow />
  </div>

  <template v-if="showNotifications">
    <div class="settings-toggle-row">
      <div class="sub-title">
        {{ $t('settingsExtra.tokenDetector') }}
      </div>
      <div class="settings-toggle-switch">
        <ToggleSwitch
          :options="tokenDetectorOptions"
          :selectedSwitch="isTokenDetectorEnabled ? 'on' : 'off'"
          @change="onTokenDetectorChange($event.value)"
          name="tokenDetectorToggle"
          group="tokenDetectorGroup"
        />
      </div>
    </div>

    <div class="settings-toggle-row" :class="{ disabled: !isTokenDetectorEnabled }">
      <div class="sub-title">
        {{ $t('settingsExtra.soundEffects') }}
      </div>
      <div class="settings-toggle-switch">
        <ToggleSwitch
          :options="soundNotifierOptions"
          :selectedSwitch="isSoundEnabled ? 'on' : 'off'"
          :disabled="!isTokenDetectorEnabled"
          @change="onSoundNotifierChange($event.value)"
          name="soundNotifierToggle"
          group="soundNotifierGroup"
        />
      </div>
    </div>

    <div v-if="showNewsNotifications" class="settings-toggle-row">
      <div class="sub-title">
        {{ $t('settingsExtra.newsNotifications') }}
      </div>
      <div class="settings-toggle-switch">
        <ToggleSwitch
          :options="newsNotificationsOptions"
          :selectedSwitch="isNewsNotificationsEnabled ? 'on' : 'off'"
          @change="onNewsNotificationsChange($event.value)"
          name="newsNotificationsToggle"
          group="newsNotificationsGroup"
        />
      </div>
    </div>
  </template>

  <div v-if="showLanguage" class="change-language">
    <div class="sub-title">
      {{ $t('pages.settings.changeLanguage') }}
    </div>
    <div class="settings-language-select">
      <Multiselect
        v-model="currentLanguage"
        :options="locales"
        :searchable="false"
        :allow-empty="false"
        :show-labels="false"
        @select="onSelectLocale"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed, watchEffect } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { i18n, SUPPORT_LOCALES, setI18nLanguage } from '@/plugins/i18n';
import { isWebViewApp } from '@/api/sub-utils';
import Multiselect from '@/components/multiselect';
import ToggleSwitch from '@/components/ToggleSwitch.vue';
import narrow from '@/components/svg/narrowRight.vue';
import { isFeatureEnabledForEnv } from '../config';

const tokenDetectorModules = import.meta.glob('../../token-detector/index.ts', { eager: true });
const tokenDetectorMod = Object.values(tokenDetectorModules)[0];
const tokenDetectorService = tokenDetectorMod?.tokenDetectorService || null;
const soundNotifier = tokenDetectorMod?.soundNotifier || null;

const pushNotificationsModules = import.meta.glob('../../push-notifications/index.ts', { eager: true });
const pushNotificationsMod = Object.values(pushNotificationsModules)[0];
const setNewsNotificationsEnabled = pushNotificationsMod?.setNewsNotificationsEnabled || null;
const getNewsNotificationsEnabled = pushNotificationsMod?.getNewsNotificationsEnabled || null;

export default {
  name: 'SettingsExtraItems',
  components: {
    Multiselect,
    ToggleSwitch,
    narrow,
  },
  emits: ['openNfcSettings'],
  setup() {
    const { t } = useI18n();
    const store = useStore();
    const router = useRouter();
    const locales = computed(() => store.state.lang.locales || SUPPORT_LOCALES);
    const currentLanguage = ref(store.state.lang.locale);

    const showNfc = computed(() => isFeatureEnabledForEnv('nfcSettings') && !isWebViewApp());
    const showNotifications = computed(() => Boolean(tokenDetectorService) && isFeatureEnabledForEnv('notificationSettings'));
    const showNewsNotifications = computed(() => Boolean(pushNotificationsMod) && isFeatureEnabledForEnv('newsSettings'));
    const showLanguage = computed(() => isFeatureEnabledForEnv('languageSelect'));

    const isTokenDetectorEnabled = ref(tokenDetectorService?.isServiceEnabled?.() ?? true);
    const isSoundEnabled = ref(soundNotifier?.isEnabled?.() ?? true);
    const isNewsNotificationsEnabled = ref(getNewsNotificationsEnabled ? getNewsNotificationsEnabled() : true);

    watchEffect(() => {
      currentLanguage.value = store.state.lang.locale;
      if (tokenDetectorService) {
        isTokenDetectorEnabled.value = tokenDetectorService.isServiceEnabled();
      }
      if (soundNotifier) {
        isSoundEnabled.value = soundNotifier.isEnabled();
      }
      if (getNewsNotificationsEnabled) {
        isNewsNotificationsEnabled.value = getNewsNotificationsEnabled();
      }
    });

    const tokenDetectorOptions = computed(() => ({
      layout: {
        color: 'rgba(255, 255, 255, .6)',
        backgroundColor: 'rgba(0,0,0,0)',
        selectedColor: 'rgba(17, 17, 17, 1)',
        selectedBackgroundColor: 'rgb(255, 152, 0)',
        borderColor: 'none',
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontWeightSelected: 'normal',
        squareCorners: true,
        noBorder: false,
      },
      size: {
        fontSize: 1.3,
        height: 2.3,
        padding: 0.2,
        width: 6.5,
      },
      config: {
        delay: 0.2,
        preSelected: isTokenDetectorEnabled.value ? 'on' : 'off',
        disabled: false,
        items: [
          { name: t('settingsExtra.on'), value: 'on', width: '46px', padding: '5px 8px' },
          { name: t('settingsExtra.off'), value: 'off', width: '46px', padding: '5px 8px' },
        ],
      },
    }));

    const soundNotifierOptions = computed(() => ({
      layout: {
        color: 'rgba(255, 255, 255, .6)',
        backgroundColor: 'rgba(0,0,0,0)',
        selectedColor: 'rgba(17, 17, 17, 1)',
        selectedBackgroundColor: 'rgb(255, 152, 0)',
        borderColor: 'none',
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontWeightSelected: 'normal',
        squareCorners: true,
        noBorder: false,
      },
      size: {
        fontSize: 1.3,
        height: 2.3,
        padding: 0.2,
        width: 6.5,
      },
      config: {
        delay: 0.2,
        preSelected: isSoundEnabled.value ? 'on' : 'off',
        disabled: !isTokenDetectorEnabled.value,
        items: [
          { name: t('settingsExtra.on'), value: 'on', width: '46px', padding: '5px 8px' },
          { name: t('settingsExtra.off'), value: 'off', width: '46px', padding: '5px 8px' },
        ],
      },
    }));

    const newsNotificationsOptions = computed(() => ({
      layout: {
        color: 'rgba(255, 255, 255, .6)',
        backgroundColor: 'rgba(0,0,0,0)',
        selectedColor: 'rgba(17, 17, 17, 1)',
        selectedBackgroundColor: 'rgb(255, 152, 0)',
        borderColor: 'none',
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontWeightSelected: 'normal',
        squareCorners: true,
        noBorder: false,
      },
      size: {
        fontSize: 1.3,
        height: 2.3,
        padding: 0.2,
        width: 6.5,
      },
      config: {
        delay: 0.2,
        preSelected: isNewsNotificationsEnabled.value ? 'on' : 'off',
        disabled: false,
        items: [
          { name: t('settingsExtra.on'), value: 'on', width: '46px', padding: '5px 8px' },
          { name: t('settingsExtra.off'), value: 'off', width: '46px', padding: '5px 8px' },
        ],
      },
    }));

    const onTokenDetectorChange = async (val) => {
      const enabled = val === 'on';
      isTokenDetectorEnabled.value = enabled;
      if (tokenDetectorService?.setServiceEnabled) {
        await tokenDetectorService.setServiceEnabled(enabled);
      }
    };

    const onSoundNotifierChange = async (val) => {
      const enabled = val === 'on';
      isSoundEnabled.value = enabled;
      if (soundNotifier?.setEnabled) {
        await soundNotifier.setEnabled(enabled);
      }
    };

    const onNewsNotificationsChange = (val) => {
      const enabled = val === 'on';
      isNewsNotificationsEnabled.value = enabled;
      if (setNewsNotificationsEnabled) {
        setNewsNotificationsEnabled(enabled);
      }
    };

    const onSelectLocale = (locale) => {
      if (i18n.global.locale.value !== locale) {
        store.dispatch('lang/setLocale', { locale });
        setI18nLanguage(locale);
        if (router.currentRoute.value.name) {
          router.push({ name: router.currentRoute.value.name, params: { locale: locale } });
        }
      }
    };

    return {
      isWebViewApp,
      showNfc,
      showNotifications,
      showNewsNotifications,
      showLanguage,
      locales,
      currentLanguage,
      isTokenDetectorEnabled,
      isSoundEnabled,
      isNewsNotificationsEnabled,
      tokenDetectorOptions,
      soundNotifierOptions,
      newsNotificationsOptions,
      onTokenDetectorChange,
      onSoundNotifierChange,
      onNewsNotificationsChange,
      onSelectLocale,
    };
  },
};
</script>

<style scoped lang="scss">
.changeSettings, .change-language, .settings-toggle-row {
  width: 90%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 18px;
  cursor: default;
}

.changeSettings, .settings-toggle-row {
  border-bottom: 2px solid $color-black-light;
}

.changeSettings {
  &:hover {
    cursor: pointer;
  }

  svg {
    height: 18px;
  }
}

.settings-toggle-row {
  padding: 10px 18px;
  transition: opacity 0.25s ease;

  &.disabled {
    opacity: 0.38;
    pointer-events: none;
  }

  .sub-title {
    font-size: 16px;
    color: $color-white;
  }
}

.settings-toggle-switch {
  display: flex;
  align-items: center;
}

.change-language {
  padding: 5.5px 18px;
}

.settings-language-select {
  width: 100px;
  
  :deep(.multiselect) {
    background-color: transparent;
    
    .multiselect__tags {
      background-color: $color-black-38;
      border: 1px solid $color-black-40;
      border-radius: 12px;
      padding: 8px 12px;
      height: 40px;
      color: $color-white;
    }

    .multiselect__option {
      height: 40px;
    }

    .multiselect__single {
      background-color: transparent;
      color: $color-white;
    }

    .multiselect__content-wrapper {
      background-color: $color-black-23;
      border: 1px solid $color-black-40;
      border-bottom-left-radius: 12px;
      border-bottom-right-radius: 12px;
      z-index: 50;
    }

    .multiselect__option {
      background-color: transparent;
      color: $color-white;
      
      &--highlight {
        background-color: $color-orange;
        color: $color-white;
      }

      &--selected {
        font-weight: bold;
      }
    }

    .multiselect__select {
      height: 40px;
      &::before {
        border-color: $color-white transparent transparent;
      }
    }
  }
}
</style>
