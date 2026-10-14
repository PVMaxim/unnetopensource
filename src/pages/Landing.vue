<template>
  <main>
    <div class="container-main">
      <Loading v-if="isLoading" :messageLoad = messageLoad :titleLoad = titleLoad />
      <template v-else>
      <div class="demo">{{ $t('pages.landing.demo') }}</div>
      <NextGen :windowSize=windowSize />
      <InnovativeFeatures :windowSize=windowSize />
      <YourSecure :windowSize=windowSize />
      <Application />
      <Supported :windowSize=windowSize />
      <Earn :windowSize=windowSize />
      <Next :windowSize=windowSize />
      <WhiteLable :windowSize=windowSize />
      <Footer :windowSize=windowSize />
    </template>
    </div>
  </main>
</template>

<script>
  import { ref, onUnmounted, onMounted, computed, watchEffect } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRouter, useRoute } from 'vue-router';
  import Loading from '@/components/Loading.vue';
  import NextGen from '@/pages/sections/NextGen.vue';
  import InnovativeFeatures from '@/pages/sections/InnovativeFeatures.vue'; 
  import YourSecure from '@/pages/sections/YourSecure.vue';
  import Supported from '@/pages/sections/Supported.vue';
  import Earn from '@/pages/sections/Earn.vue';
  import Next from '@/pages/sections/Next.vue';
  import Footer from '@/pages/sections/Footer.vue';
  import WhiteLable from '@/pages/sections/WhiteLable.vue';
  import Application from '@/pages/sections/Application.vue';

  export default {
    name: 'Landing page',
    layout: 'Default',
    components: {
      Loading,
      NextGen,
      InnovativeFeatures,
      YourSecure,
      Supported,
      Earn,
      Next,
      Footer,
      WhiteLable,
      Application
    },
    setup() {
      const { t } = useI18n();
      const isLoading = ref(true);
      const titleLoad = ref('Please wait.');
      const messageLoad = ref('Getting balances');
      const route = useRoute();
      const router = useRouter();
      const windowSize = computed(() => { 
        let viewportWidth = window.innerWidth;
        window.addEventListener("resize", () => {
        viewportWidth = window.innerWidth;
        })

        return viewportWidth
      });

      onMounted(async() => {
        console.log(`public lenght ${route.params.publicKey?.length}`);
        // if (/^[a-fA-F0-9]{134}$/.test(route.params.publicKey) ) {
        //   //router.push({ name: 'authorization', params: { publicKey: route.params.publicKey } })
        //   console.log(`public key valid`);
        // } else {
        //   console.log(`public key NOT valid`);
        // }
        document.body.classList.add('scroll')
        isLoading.value = false;
      });

      onUnmounted(() => {
        document.body.classList.remove('scroll')
      });

      watchEffect(async() => {
        if (windowSize.value > 700) {
          document.body.classList.add('full-width')
        } else {
          document.body.classList.remove('full-width')
        }
      });

      return { 
        isLoading, titleLoad, messageLoad, windowSize
      }
    },
  }
</script>

<style lang="scss">
body.scroll {
  overflow-y: auto;

  main {
    height: initial;
    padding-top: 0;

    .container-main {
      max-width: 1440px;
    }

    .title {
			font-size: 32px;
			text-align: center;
			font-weight: 600;
		}

    .demo {
      color: rgba($color-white, .5);
      font-size: 12px;
      text-align: center;
      margin-top: 12px;
    }

    .text-small {
      font-size: 12px;
    }

    .tik-white {
      width: 18px;
      height: 18px;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 12px;
      color: $color-black;
      background-color: $color-white;
      border-radius: 50%;
      margin-right: 12px;
    }

    .mtds {
      margin-top: 9vw;
    }

    .text-group {
			font-size: 18px;
			text-align: center;
		}

    button {
      font-size: 16px;
    }

    section {
      margin-top: 24px;
    }
  
    .container-main{
      width: 90%;
      height: 100%;
      flex-direction: column;
    }

    .round-background {
      position: relative;
      border: none;
      border-radius: 25px;
      overflow: hidden;
      padding: 24px 5%;
      background: rgb(34,34,34);
      background: linear-gradient(180deg, $color-black-34 0%, $color-black-24 80%);
      overflow: hidden;

      &.gradient-border {
        // border-width: 1px;
        // border-style: solid;
        // border-image: linear-gradient(to right, rgba($color-orange, 0), rgba($color-orange, 1)) 1;

        background: linear-gradient(180deg, $color-black-34 0%, $color-black-24 80%) padding-box,
              linear-gradient(to right bottom, rgba($color-orange, 0), rgba($color-orange, .3)) border-box;
        border: 1px solid transparent;
      }

      .gradient {
        position: absolute;
        width: 100%;
        height: 400px;
        left: 0px;
        top: 0px;
        background: radial-gradient(circle, rgba(255, 152, 0, 0.5) 0%, rgba(255, 152, 0, 0) 80%);
        background-position: 50% 170%;
        background-size: 100% 200%;
        background-repeat: no-repeat;
        z-index: 0;
      }

      .gradient-left {
        position: absolute;
        width: 100px;
        height: 100%;
        left: 0px;
        bottom: 0px;
        background: radial-gradient(circle, rgba(255, 152, 0, .5) 0%, rgba(255, 152, 0, 0) 80%);
        background-position: 100% 100%;
        background-size: 700px 150%;
        background-repeat: no-repeat;
      }

      .left-group {
        z-index: 1;
      }
      // &::before {
      //   content: '';
      //   width: 50vw;
      //   height: 50vw;
      //   background: radial-gradient(circle, rgba(255,152,0,1) 0%, rgba(255,152,0,0) 80%);
      // }
    }
  }

  @media (min-width: 700px) {
    main {
      section {
        margin-top: 48px;
      }
      .round-background  {
        .gradient {
          height: 400px;
          background: radial-gradient(circle, rgba(255, 152, 0, 0.5) 0%, rgba(255, 152, 0, 0) 80%);
          background-position: 50% 100%;
          background-size: 100% 600%;
        }
      }
    }
  }
}
@supports (height: 100dvh) {
  body {
    height: 100dvh;
  }
}
</style>