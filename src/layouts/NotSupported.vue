<template>
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

      const pushOnRootPage = () => {
        router.push({ name: 'authorization' });
      }

      return { pushOnRootPage };
    }
  });
</script>

<style scoped lang="scss">
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