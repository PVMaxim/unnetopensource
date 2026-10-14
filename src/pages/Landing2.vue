<template>
  <div class="landing2-layout">
    <LandingHeader />
    <main>
      <Hero />
      <TractionBar />
      <WalletFeatures />
      <HowItWorks />
      <SwapFeature />
      <ValueProps />
      <SocialProof />
      <StorageComparison />
      <DualCTA />
      <AppDownload />
      <AboutTeam />
      <Roadmap />
      <FAQ />
    </main>
    <LandingFooter />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import './landing2/landing-globals.css';
import LandingHeader from './landing2/layout/LandingHeader.vue';
import LandingFooter from './landing2/layout/LandingFooter.vue';
import Hero from './landing2/Hero.vue';
import TractionBar from './landing2/TractionBar.vue';
import WalletFeatures from './landing2/WalletFeatures.vue';
import HowItWorks from './landing2/HowItWorks.vue';
import SwapFeature from './landing2/SwapFeature.vue';
import ValueProps from './landing2/ValueProps.vue';
import SocialProof from './landing2/SocialProof.vue';
import StorageComparison from './landing2/StorageComparison.vue';
import DualCTA from './landing2/DualCTA.vue';
import AppDownload from './landing2/AppDownload.vue';
import AboutTeam from './landing2/AboutTeam.vue';
import Roadmap from './landing2/Roadmap.vue';
import FAQ from './landing2/FAQ.vue';

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
body, html {
  font-size: initial !important;
  &.scroll {
    overflow-y: auto !important;
    main {
      padding-top:0;
    }
  }

  &.web-app {
    main {
      padding-top: 0;
      padding-bottom: 0;

      .hero-section {
        padding-top: calc(5rem + 42px);
      }

      @media (min-width: 640px) {
        .hero-section {
          padding-top: calc(6rem + 42px);
        }
      }
    }
    header {
      padding-top: 0px;

      nav.landing-nav, nav.landing-nav.is-scrolled{
        padding-top: 42px;

      }
    }
    footer.landing-footer {
      padding-bottom: 42px;
    }
  }
}
</style>
