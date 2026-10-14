<template>
	<section id="support" class="container-main" :class="{'round-background': windowSize < 700}">
		<div v-if="windowSize > 700" class="gradient"></div>
		<div class="title">
			<div v-html="$t('pages.landing.supported.title')"></div>
			<div class="text-orange second-word" v-html="$t('pages.landing.supported.titleHighlight')"></div>
		</div>
		<div class="text-group text-white mt-12">
			<span v-html="$t('pages.landing.supported.blockchains1')"></span>
			<span class="second-word" v-html="$t('pages.landing.supported.blockchains2')"></span>
		</div>
		<div class="section-image">
			<SupportSvg v-if="windowSize < 700" />
			<SupportBigSvg v-else />
		</div>
	</section>
</template>

<script>
	import { defineComponent } from 'vue'
	import SupportSvg from "@/components/svg/landing/support.vue"
	import SupportBigSvg from "@/components/svg/landing/supportBig.vue"
	import { useI18n } from 'vue-i18n'

	export default defineComponent({
    name: 'Supported section',
	props: {
		windowSize: {
			type: [Number,null],
			required: false,
		},
  	},
    components: {
		SupportSvg,
		SupportBigSvg
    },
    setup() {
      const { t } = useI18n();
      return { }
    },
	})
</script>

<style scoped lang="scss">
	#support {
		padding-bottom: 0px;
		.section-image {
			width: 110%;
			svg {
				position: relative;
				width: 100%;
			}
		}

		.title {
			display: flex;
			flex-direction: column;
			align-items: center;
			font-size: clamp(32px, calc(33px + (61 - 33) * (100vw - 700px)/(1100 - 700)), 62px);
		}

		.text-group {
			display: flex;
			flex-direction: column;
			align-items: center;
			font-size: $fontSizeTextBig;
			font-weight: 600;
		}

		@media (min-width: 480px) {
			.title {
				margin-top: 24px;
			}
			.text-group, .section-image {
				margin-top: 48px;
			}
   	 	}
	}

	@media (min-width: 700px) {
		main {
			#support {

				.title, .text-group  {
					.second-word {
						margin-left: 12px;
					}
				}

				
			}
		}
	}
</style>