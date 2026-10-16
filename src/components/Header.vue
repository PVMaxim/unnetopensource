<template>
  <header 
    id="site-header" 
    class="site-header" 
    role="banner" 
    itemscope 
    itemtype="https://schema.org/Organization"
  >
    <div class="container-main">
      <div id="header-logo" @click="goToWallet">
        <Logo />
      </div>

      <div class="header-menu" :class="{ open: menuOpen }">
        <nav class="main-menu" role="navigation">
          <ul>
            <li v-if="!storePublicKeyCard" class="nav-item" @click="toggleMenu">
              <router-link :to="{ name: 'authorization' }" class="nav-link" active-class="active">
                {{ $t('nav.authorization') }}
              </router-link>
            </li>

            <template v-if="isUserRegistered">
              <li v-for="link in authenticatedLinks" :key="link.name" class="nav-item" @click="toggleMenu">
                <router-link :to="{ name: link.name }" class="nav-link" active-class="active">
                  {{ $t(link.label) }}
                </router-link>
              </li>
            </template>

            <li class="nav-item" @click="toggleMenu">
              <router-link :to="{ name: 'settings' }" class="nav-link" active-class="active">
                {{ $t('nav.settings') }}
              </router-link>
            </li>
            <li class="nav-item" @click="toggleMenu">
              <router-link :to="{ name: 'restore-card' }" class="nav-link" active-class="active">
                {{ $t('nav.restore-card') }}
              </router-link>
            </li>

            <template v-if="isUserRegistered">
              <li class="nav-item" @click="toggleMenu">
                <div class="nav-link" @click="handleSignOut">
                  {{ $t('nav.signOut') }}
                </div>
              </li>
            </template>
          </ul>

          <div class="main-menu-footer">
            <div class="footer-title">United Wallet</div>
            <div class="footer-copyright">
              ©2024 - {{ new Date().getUTCFullYear() }} {{ $t('footer.allRightsReserved') }}
            </div>
          </div>
        </nav>
      </div>

      <div class="mobile-menu">
        <button 
          type="button" 
          class="h-burger" 
          :class="{ open: menuOpen }" 
          @click="toggleMenu"
          aria-label="Toggle Navigation"
        >
          <span class="h-burger-but"></span>
        </button>

        <multiselect 
          v-if="prefixStore" 
          v-model="rpcSelected" 
          class="select-provider" 
          track-by="serialnumber" 
          label="name"
          placeholder="Select Network" 
          :options="rpcOptions" 
          :searchable="false" 
          :allow-empty="false"
          :show-labels="false"
          openDirection="bottom"
          @select="handleRpcChange"
          @open="providerIsOpen = true"
          @close="providerIsOpen = false"
        >
          <template #singleLabel="{ option }">
            <component 
              v-if="getTokenIcon(option.name)" 
              :is="getTokenIcon(option.name)" 
              class="icon" 
            />
            <span v-if="providerIsOpen">{{ option.displayName || option.name }}</span>
          </template>

          <template #option="props">
            <component 
              v-if="getTokenIcon(props.option.name)" 
              :is="getTokenIcon(props.option.name)" 
              class="icon" 
            />
            <span>{{ props.option.displayName || props.option.name }}</span>
          </template>

          <template #multiselectElementSeparator="props">
            <div 
              v-if="networkHistory.length > 0 && props.index === networkHistory.length - 1 && props.index < rpcOptions.length - 1" 
              class="with-separator"
            ></div>
          </template>
        </multiselect>
      </div>

      <div class="logo-mobile"></div>
    </div>
  </header>
</template>

<script>
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { rpcList } from '@/api/constants-types';
import { clearUserSettings, getWallet, getStorePrefix } from '@/api/ApiHandler';
import { isCardRegistered } from '@/api/check-guards';
import { getTokenIcon } from '@/api/token-icons';
import { useEventsBus } from '@/plugins/eventBus.js';
import { runApplicationChecks } from '@/api/updatesChainResponsability';
import Logo from '@/components/svg/logo.vue';
import Multiselect from '@/components/multiselect';

export default defineComponent({
  name: 'Header',
  components: {
    Multiselect,
    Logo,
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    const menuOpen = ref(false);
    const providerIsOpen = ref(false);
    const rpcSelected = ref(store.state.settings.rpcProvider);

    const authenticatedLinks = computed(() => [
      { name: 'dashboard', label: 'nav.dashboard' },
      { name: 'send', label: 'nav.send' },
      { name: 'receive', label: 'nav.receive' },
      { name: 'swap', label: 'nav.swap' },
      { name: 'wallet-connect', label: 'nav.wallet-connect' },
    ]);

    const storePublicKeyCard = computed(() => store.state.user.publicKeyCard);
    const isUserRegistered = computed(() => storePublicKeyCard.value && isCardRegistered());
    const prefixStore = computed(() => getStorePrefix());

    const networkHistory = computed(() => {
      const history = store.state[`${prefixStore.value}.customtoken`]?.rpcListHistory;
      return Array.isArray(history) ? history : [];
    });

    const rpcOptions = computed(() => {
      const historyIds = networkHistory.value.map(item => item.serialnumber);
      return [...rpcList].sort((a, b) => {
        const indexA = historyIds.indexOf(a.serialnumber);
        const indexB = historyIds.indexOf(b.serialnumber);

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.serialnumber - b.serialnumber;
      });
    });

    const toggleMenu = () => {
      menuOpen.value = !menuOpen.value;
      document.body.classList.toggle('menuOpen', menuOpen.value);
    };

    const goToWallet = () => router.push({ name: 'dashboard' });

    const handleSignOut = async () => {
      await clearUserSettings();
      router.push({ name: 'authorization' });
    };

    const handleRpcChange = async () => {
      if (!rpcSelected.value) return;

      await store.dispatch('settings/setRpcProvider', rpcSelected.value);
      store.dispatch(`${prefixStore.value}.customtoken/setRpcListHistory`, rpcSelected.value);

      try {
        const accountAddress = await getWallet(storePublicKeyCard.value, true);
        await store.dispatch('user/setAccountAddress', accountAddress);
      } catch (err) {
        console.error('[Header] Failed to update wallet address after RPC change:', err);
      }

      useEventsBus().emit('rpcProviderChange', true);
      runApplicationChecks();
    };


    onMounted(() => {
      const unwatch = store.watch(
        (state) => state.settings.rpcProvider,
        (newProvider) => { rpcSelected.value = newProvider; }
      );
      
      onUnmounted(() => unwatch());
    });

    return {
      menuOpen,
      toggleMenu,
      storePublicKeyCard,
      goToWallet,
      handleSignOut,
      rpcSelected,
      rpcOptions,
      networkHistory,
      handleRpcChange,
      providerIsOpen,
      getTokenIcon,
      isCardRegistered,
      prefixStore,
      isUserRegistered,
      authenticatedLinks
    };
  }
});
</script>

<style scoped lang="scss">
header {
  position: fixed;
  display: flex;
  flex-direction: column;
  padding-top: 8px;
  top: 0;
  left: 0;
  right: 0;
  align-items: center;
  height: 76px;
  width: 100%;
  isolation: isolate;
  z-index: 11;
  
  .container-main {
    position: relative;
    max-width: 620px;
    padding: 0px;
  }

  #header-logo {
    z-index: 25;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    height: 40px;
    svg { height: 40px; }
  }

  .mobile-menu {
    display: flex;
    align-items: center;
  }

  :deep(.select-provider) {
    position: absolute;
    right: 5%;

    &.multiselect {
      width: 82px;
      @include transition(width .2s ease-in-out);
      
      .multiselect__single, .multiselect__option {
        svg {
          width: 36px;
          height: 36px;
        }
      }
      .multiselect__select { height: 48px; }
      .multiselect__content-wrapper {
        width: 150px;
        height: 0px;
        border-radius: 24px;
        @include transition(height .2s ease-in-out);
      }
    }

    &.multiselect.multiselect--active {
      width: 170px;
      .multiselect__content-wrapper {
        width: 170px;
        height: initial;
      }
    }

    .with-separator {
      height: 1px;
      width: calc(100% - 24px);
      margin: 8px 12px;
      background-color: $color-black-60;
    }

    .multiselect__tags {
      cursor: pointer;
      display: flex;
      background-color: $color-black-38;
      border-radius: 50px;
      border: 1px solid $color-black-40;
      margin: 0;
      padding: 8px 0px 0px 3px;
      height: 48px;
    }
  }

  .header-menu {
    position: fixed;
    left: -100vw;
    top: 0px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100vw;
    height: 100vh;
    background-color: $color-black-17;
    z-index: 17;
    @include transition(left .3s ease-in-out);

    &.open { left: 0; }

    nav {
      flex-direction: column;
      justify-content: center;
      height: 100%;
      overflow: hidden;

      ul {
        flex-direction: column;
        justify-content: center;
        height: 100%;
      }

      .main-menu-footer {
        display: flex;
        flex-direction: column;
        margin-bottom: 77px;
        align-items: center;
        font-size: 13px;
      }
    }
  }

  nav {
    display: flex;
    align-items: center;
    width: 100%;
    height: 60px;
    white-space: nowrap;

    ul {
      display: flex;
      align-items: center;
      gap: 3%;
      list-style-type: none;
      padding: 0;
      margin: 0;
    }

    .nav-link {
      color: $color-white;
      cursor: pointer;
      font-size: 16px;
      @include transition(color .3s ease-in-out);

      &:hover, &.active { color: $color-orange; }
    }
  }
  
  .h-burger {
    position: absolute;
    left: 5%;
    display: flex;
    z-index: 20;
    width: 48px;
    height: 48px;
    appearance: none;
    border: 1px solid $color-black-40;
    border-radius: 50%;
    cursor: pointer;
    background-color: $color-black-38;
    color: $color-white;
    @include transition(left .3s ease-in-out);
    
    &.open { left: 82%; background-color: $color-black; }
    &:focus { outline: none; }

    .h-burger-but {
      display: block;
      position: absolute;
      height: 2px;
      background-color: $color-white;
      left: 30%;
      right: 30%;
      top: 50%;
      transform: translateY(-50%);
      @include transition(background 200ms);

      &::before, &::after {
        position: absolute;
        display: block;
        left: 0;
        width: 100%;
        height: 2px;
        background-color: $color-white;
        content: "";
        transition: 200ms;
      }

      &::before { top: -6px; transition-property: top, transform; }
      &::after { bottom: -6px; transition-property: bottom, transform; }
    }

    &.open .h-burger-but {
      background: transparent;
      &::before { top: 0; transform: rotate(45deg); }
      &::after { bottom: 0; transform: rotate(-45deg); }
    }
  }
}

.logo-mobile {
  width: 30px;
  height: 30px;
  position: absolute;
  left: calc(5% + 65px);
  cursor: pointer;
}
</style>
