<template>
	<section id="your-secure" class="container-main round-background">
		<div class="gradient"></div>
		<template v-if="windowSize < 700">
		<div class="title">
			<div v-html="$t('pages.landing.your-secure.title')"></div >
			<div class="text-orange" v-html="$t('pages.landing.your-secure.titleHighlight')"></div>
		</div>
		<div class="section-image mt-12">
			<img  :src=setupYourCardImg :alt="$t('pages.landing.your-secure.altText')" loading="lazy">
		</div>
		<div class="text-group">
			<div class="text-item"><div class="tik-white">1</div><span v-html="$t('pages.landing.your-secure.step1')"></span></div>
			<div class="text-item"><div class="tik-white">2</div><span v-html="$t('pages.landing.your-secure.step2')"></span></div>
			<div class="text-item"><div class="tik-white">3</div><span v-html="$t('pages.landing.your-secure.step3')"></span></div>
			<div class="text-item"><div class="tik-white">4</div><span v-html="$t('pages.landing.your-secure.step4')"></span></div>
		</div>
		<div class="button-group mt-24">
			<Button
			:buttonName="$t('pages.landing.your-secure.btnGet')"
			buttonType="main"
			@onClick="redirectToShop()"
			/>
		</div>
		<div class="text-small text-gray mt-24" v-html="$t('pages.landing.your-secure.note')"></div>
	</template>
	<template v-else>
		<div class="left-group">
			<div class="left-box">
				<div class="title">
					<div v-html="$t('pages.landing.your-secure.title')"></div >
					<div class="text-orange" v-html="$t('pages.landing.your-secure.titleHighlight')"></div>
				</div>
				<div class="text-group">
					<div class="text-item"><div class="tik-white">1</div><span v-html="$t('pages.landing.your-secure.step1')"></span></div>
					<div class="text-item"><div class="tik-white">2</div><span v-html="$t('pages.landing.your-secure.step2')"></span></div>
					<div class="text-item"><div class="tik-white">3</div><span v-html="$t('pages.landing.your-secure.step3')"></span></div>
					<div class="text-item"><div class="tik-white">4</div><span v-html="$t('pages.landing.your-secure.step4')"></span></div>
				</div>
				<div class="button-group mt-24">
					<Button
					:buttonName="$t('pages.landing.your-secure.btnGet')"
					buttonType="main"
					@onClick="redirectToShop()"
					/>
				</div>
			</div>
			<div class="sub-test text-small text-gray mt-24" v-html="$t('pages.landing.your-secure.note')"></div>
		</div>
		<div class="right-group">
			<div class="section-image">
				<img  :src=setupYourCardBigImg :alt="$t('pages.landing.your-secure.altText')" loading="lazy">
			</div>
		</div>
	</template>
	</section>
</template>

<script>
	import { defineComponent } from 'vue'
	import Button from "@/components/Button.vue"
	import PhoneSvg from "@/components/svg/landing/phone.vue"
	import CheckSvg from "@/components/svg/landing/check.vue"
	import { useI18n } from 'vue-i18n'

	export default defineComponent({
    name: 'YourSecure section',
	props: {
		windowSize: {
			type: [Number,null],
			required: false,
		},
  	},
    components: {
		Button,
		PhoneSvg,
		CheckSvg
    },
    setup() {
		const { t } = useI18n();
		const setupYourCardImg = new URL(`@/assets/images/setup-your-card.png`, import.meta.url).href;
		const setupYourCardBigImg = new URL(`@/assets/images/setup-your-card-big.png`, import.meta.url).href;

		const redirectToShop = () => {
			window.open('//shop.united.network/products/nfc-card-wallet', '_blank');
		}

      	return { redirectToShop, setupYourCardImg, setupYourCardBigImg }
    },
	})
</script>

<style scoped lang="scss">
	#your-secure {
		.section-image {
			width: 100%;
			display: flex;
			justify-content: center;
			svg {
				width: 80%;
				position: relative;
			}
			img {
				width: 80%;
				position: relative;
				margin-top: 24px;
				height: 120%;
			}
		}
		.title {
			font-size: clamp(32px, calc(33px + (61 - 33) * (100vw - 700px)/(1100 - 700)), 62px);
		}
		.button-group {
			display: flex;
			flex-direction: column;
		}

		.text-group {
			margin-top: -64px;
			font-size: $fontSizeTextBig;
			text-align: center;
			font-weight: 400;
			color: rgba($color-white, .5);
			z-index: 1;

			.text-item {
				display: flex;
				flex-direction: row;
				text-align: left;
				margin-bottom: 8px;
				align-items: center;

				svg {
					width: 18px;
					height: 18px;
					margin-right: 12px;
				}
			}
		}

		@media (min-width: 480px) {
			.title {
				margin-top: 24px;
			}

			.gride-group, .button-group, .section-image {
				margin-top: 48px;
			}

			.text-group {
				margin-top: -48px;
			}
   	 	}
	}
	@media (min-width: 700px) {
		main {
			#your-secure {
				flex-direction: row;
				align-items: stretch;

				.title {
					text-align: left;
				}

				.text-group {
					text-align: left;
					margin-top: 12px;
				}

				.text-item {
					margin-bottom: 12px;
				}

				.button-group {
					flex-direction: row;
					justify-content: start;

					button {
						width: 250px;
						text-wrap: nowrap;
					}
				}
				.left-group {
					width: 50%;
					display: flex;
					flex-direction: column;
					justify-content: space-between;
				}

				.right-group {
					display: flex;
        			justify-content: center;
					width: 50%;

					.section-image {
						position: relative;
						margin: 0;
						bottom: -30%;
						height: 50vw;

						img {
							margin: 0;
							width: initial;
						}
					}
				}
			}
		}
	}

	@media (min-width: 1000px) {
		main {
			#your-secure {
				.right-group {
					.section-image {
						bottom: -10%;
						height: 40vw;
					}
				}
				
				.sub-test {
					width: 70%;
				}
			}
		}
	}

	@media (min-width: 1500px) {
		main {
			#your-secure {
				.right-group {
					.section-image {
						bottom: -10%;
						height: 30vw;
					}
				}
			}
		}
	}
</style>