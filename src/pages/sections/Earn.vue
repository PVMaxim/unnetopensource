<template>
	<section id="earn" class="container-main round-background">
		<div class="gradient"></div>
		<div class="section-image">
			<EarnSvg />
		</div>
		<div class="title">
			<div v-html="$t('pages.landing.earn.title')"></div>
			<div class="text-orange second-word" v-html="$t('pages.landing.earn.titleHighlight')"></div>
		</div>
		<div class="text-group text-gray mt-24" v-html="$t('pages.landing.earn.description')"></div>
		<div class="button-group mt-24">
			<Button
			:buttonName="$t('pages.landing.earn.button')"
			buttonType="main"
			@onClick="redirectToReferral()"
			/>
		</div>
	</section>
</template>

<script>
	import { defineComponent } from 'vue'
	import { useI18n } from 'vue-i18n'
	import { useRouter } from 'vue-router'
	import Button from "@/components/Button.vue"
	import EarnSvg from "@/components/svg/landing/earn.vue"

	export default defineComponent({
    name: 'Earn section',
    components: {
		Button,
		EarnSvg
    },
    setup() {
		const { t } = useI18n();
		const router = useRouter();
		const redirectToReferral = () => {
			window.open('//partner.unitednetwork.cards', '_blank');
		}

      	return { redirectToReferral }
    },
	})
</script>

<style scoped lang="scss">
	#earn {
		.title {
			display: flex;
			flex-direction: column;
			align-items: center;
			margin-top: 10vw;
			font-size: clamp(32px, calc(33px + (61 - 33) * (100vw - 700px)/(1100 - 700)), 62px);
			font-weight: 600;
		}

		.section-image {
			display: flex;
			align-items: center;
			justify-content: center;

			svg {
				position: relative;
				width: 40%;
			}
		}

		.button-group {
			display: flex;
			flex-direction: column;

			button {
				margin-top: 12px;
			}
		}

		@media (min-width: 480px) {
			.section-image {
				margin-top: 24px;
			}
			.title, .text-group, .button-group {
				margin-top: 48px;
			}
   	 	}
	}

	@media (min-width: 700px) {
		main {
			#earn {
				width: 600px;

				.title {
					flex-direction: row;

					.second-word {
						margin-left: 12px;
					}
				}
			}
		}
	}
</style>