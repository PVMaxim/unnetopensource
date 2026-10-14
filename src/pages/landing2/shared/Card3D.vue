<template>
  <div class="card-3d-wrapper">
    <div class="card-float-anim">
      <img
        :src=card3dImg
        :alt="$t('landing_v2.hero.cardAlt')"
        class="card-image"
      />
    </div>
  </div>
</template>

<script>
	import { defineComponent } from 'vue';
	import { useI18n } from 'vue-i18n';

	export default defineComponent({
    name: 'Card3d section',

    setup() {
		const { t } = useI18n();
		const card3dImg = new URL(`@/pages/landing2/assets/images/product/Group 427320205.png`, import.meta.url).href;
      return { card3dImg }
    },
	})
</script>

<style scoped>
.card-3d-wrapper {
  position: relative;
  z-index: 1;
  margin-top: 2.5rem;
  margin-bottom: -0.5rem;
  display: flex;
  justify-content: center;
}

.card-float-anim {
  animation: cardFloat 6s ease-in-out infinite;
}

.card-image {
  width: 320px;
  height: auto;
  filter: drop-shadow(0 30px 60px rgba(0, 0, 0, 0.6));
}

@media (max-width: 639px) {
  .card-image {
    width: 260px;
  }
}
</style>
