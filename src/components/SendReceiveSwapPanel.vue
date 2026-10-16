<template>
  <div class="buttons-group-send-receive">
    <router-link :to="{ name: 'dashboard'}" class="button-nav nav-home" active-class="active">
      <HomeIcon />
    </router-link>
    <router-link :to="{ name: 'send'}" class="button-nav" active-class="active">
      {{ $t('nav.send') }}
    </router-link>
    <router-link :to="{ name: 'receive'}" class="button-nav" active-class="active">
      {{ $t('nav.receive') }}
    </router-link>
    <router-link :to="{ name: 'swap'}" class="button-nav" active-class="active">
      {{ $t('nav.swap') }}
    </router-link>
  </div>
</template>

  <script>
    import { defineComponent } from 'vue';
    import { useRouter } from 'vue-router';
    import HomeIcon from '@/components/svg/homeIcon.vue';

    export default defineComponent({
      name: 'SendReceiveSwapPanel',
      emits: ['buttonClickSend', 'buttonClickReceive', 'buttonClickSwap'],
      props: {
        disableSend: {
          type: Boolean,
          default: false
        },
        disableReceive: {
          type: Boolean,
          default: false
        },
        disableSwap: {
          type: Boolean,
          default: false
        },
        buttonClickSend: {
          type: [Function],
          default: null
        },
        buttonClickReceive: {
          type: [Function],
          default: null
        },
        buttonClickSwap: {
          type: [Function],
          default: null
        },
      },
      components: {
        HomeIcon
      },
      setup(props, { emit }) {
        const router = useRouter();

        const buttonClickSend = () => {
          emit('buttonClickSend');
          router.push({ name: 'send' });
        }
        const buttonClickReceive = () => {
          emit('buttonClickReceive');
          router.push({ name: 'receive' });
        }
        const buttonClickSwap = () => {
          emit('buttonClickSwap');
          router.push({ name: 'swap' });
        }

        return {
          buttonClickSend, buttonClickReceive, buttonClickSwap
        }
      }
    })
</script>

<style scoped lang="scss">
.buttons-group-send-receive {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: calc(100% - 40px);
  background-color: $color-black-23;
  border-radius: 16px;
  border: 1px solid $color-black-40;
  padding: 20px;
  margin-bottom: 12px;

  .button-nav {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 42px;
    width: 26%;
    margin: 0;
    padding: 0;
    font-size: 14px;
    font-weight: 600;;
    background-color: $color-black-32;
    border: none;
    border-radius: 12px;
    color: $color-orange;

    &.nav-home {
      width: 48px;
    }

    .home-icon {
      width: 16px;
      height: 16px;
      fill: $color-orange !important;
    }

    &.active {
      cursor: default;
      background-color: $color-orange;
      color: $color-black-17;

      .home-icon {
        fill: $color-black !important;
      }
    }
  }
}
</style>