<template>
	<section id="application" class="container-main round-background">
		<div class="gradient"></div>
		<div class="text-group mt-24">{{ $t('pages.landing.application.description') }}</div>
		<MobileApps />
		<img class="application-img" :src=mobileApplicationImg :alt="$t('pages.landing.application.imgAlt')" loading="lazy" >
	</section>
</template>

<script>
	import { defineComponent } from 'vue';
	import { useI18n } from 'vue-i18n';
	import MobileApps from "@/components/MobileApps.vue";
	

	export default defineComponent({
    name: 'Application section',
    components: {
		MobileApps
    },
    setup() {
		const { t } = useI18n();
		const mobileApplicationImg = new URL(`@/assets/images/mobile-application.png`, import.meta.url).href;
      	return { mobileApplicationImg }
    },
	})
</script>

<style scoped lang="scss">
	#application {
		.application-img {
			position: relative;
			width: 60%;
			left: 3%;
			bottom: -24px;
		}

		@media (min-width: 480px) {
			.text-group {
				margin-top: 48px;
			}
   	 	}
	}

	@media (min-width: 700px) {
		main {
			#application {
				width: 600px;
				padding: 0;
				margin: 48px 5% 0 5%;
			}
		}
	}
</style>