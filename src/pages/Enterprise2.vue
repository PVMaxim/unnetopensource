<template>
  <div class="landing2-layout pt-24">
    <LandingHeader />
    <main>
      <EnterpriseHero />
      <WhatWeOffer />
      <B2BValueProps />
      <WhatYouGain />
      <UseCases />
      <TechSpecs />
      <Positioning />
      <Pricing />
      <Distribution />
      <MerchService />
      <PartnershipCTA />
    </main>
    <LandingFooter />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import './landing2/landing-globals.css';
import LandingHeader from './landing2/layout/LandingHeader.vue';
import LandingFooter from './landing2/layout/LandingFooter.vue';

import EnterpriseHero from './landing2/enterprise/EnterpriseHero.vue';
import WhatWeOffer from './landing2/enterprise/WhatWeOffer.vue';
import B2BValueProps from './landing2/enterprise/B2BValueProps.vue';
import WhatYouGain from './landing2/enterprise/WhatYouGain.vue';
import UseCases from './landing2/enterprise/UseCases.vue';
import TechSpecs from './landing2/enterprise/TechSpecs.vue';
import Positioning from './landing2/enterprise/Positioning.vue';
import Pricing from './landing2/enterprise/Pricing.vue';
import Distribution from './landing2/enterprise/Distribution.vue';
import MerchService from './landing2/enterprise/MerchService.vue';
import PartnershipCTA from './landing2/enterprise/PartnershipCTA.vue';

onMounted(() => {
  document.body.classList.add('scroll');
  document.documentElement.classList.add('scroll');
});

onUnmounted(() => {
  document.body.classList.remove('scroll');
  document.documentElement.classList.remove('scroll');
});
</script>
<style lang="scss">
body.scroll, html.scroll {
  overflow-y: auto !important;
  main {
    padding-top:0;
  }
}
</style>
