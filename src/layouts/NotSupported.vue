<template>
  <div class="background" :style="{ background: `url(${backgroundImg}) center center / contain no-repeat` }"></div>
  <header itemscope="" itemtype="https://schema.org/Organization" id="site-header" class="site-header" role="banner">
    <div class="container-main">
    <Logo class="logo" @click.prevent="pushOnRootPage()"/>
  </div>
  </header>
    <slot></slot>
  <Footer />
</template>
    
<script>
  import {defineComponent} from "vue";
  import { useRouter } from 'vue-router';
  import Logo from '@/components/svg/logo.vue';
  import Footer from "@/components/Footer.vue";

  export default defineComponent({
    name: "NotSupportedLayout",
    components: {
      Logo,
      Footer
    },
    setup() {
      const router = useRouter();
      const backgroundImg = new URL(`@/assets/images/RadialBackgroundWithoutText.svg`, import.meta.url).href;

      const pushOnRootPage = () => {
        router.push({ name: 'authorization' });
      }

      return { backgroundImg, pushOnRootPage };
    }
  });
</script>

<style scoped lang="scss">
.background{
  width: 100%;
  height: 200%;
  max-width: 1392px;
  position: fixed;
  top: 0;
  margin: 0 auto;
  left: 50%;
  top: -95%;
  transform: translate(-50%) scale(.9);
  z-index: 0;
  opacity: .25;
  
@media (max-width: 480px) {
    transform: translate(-50%) scale(1.9);
  }
@media (min-width: 480px) and (max-width: 640px) {
    transform: translate(-50%) scale(1.7);
  }
@media (min-width: 640px) and (max-width: 820px) {
    transform: translate(-50%) scale(1.4);
  }
@media (min-width: 820px) and (max-width: 1024px) {
    transform: translate(-50%) scale(1.2);
  }
@media (min-width: 1024px) and (max-width: 1440px) {
    transform: translate(-50%) scale(1);
  }
}

header {
  position: relative;
  display: flex;
  width: 100%;
  padding-top: 24px;
  .logo {
    height: 40px;
  }
}

footer {
  font-size: 13px;
}
</style>