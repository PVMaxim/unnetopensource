<template>
	<section id="white-label" class="container-main">
		<div class="title">
			<span v-html="$t('pages.landing.white-lable.title')"></span> 
			<span class="text-orange" v-html="$t('pages.landing.white-lable.titleHighlight')"></span>
			<span v-html="$t('pages.landing.white-lable.titleEnd')"></span>
		</div>
		<div class="text-group" v-html="$t('pages.landing.white-lable.description')"></div>
		<div class="gride-group">
			<div class="text-group text-gray round-background mt-24">
				<div class="gradient"></div>
				<div class="text-title" v-html="$t('pages.landing.white-lable.customization.title')"></div>
				<div class="text-item"><CheckSvg /><span v-html="$t('pages.landing.white-lable.customization.item1')"></span></div>
				<div class="text-item"><CheckSvg /><span v-html="$t('pages.landing.white-lable.customization.item2')"></span></div>
				<div class="text-item"><CheckSvg /><span v-html="$t('pages.landing.white-lable.customization.item3')"></span></div>
				<div class="text-item"><CheckSvg /><span v-html="$t('pages.landing.white-lable.customization.item4')"></span></div>
			</div>
			<div class="text-group text-gray round-background">
				<div class="gradient"></div>
				<div class="text-title" v-html="$t('pages.landing.white-lable.perfectFor.title')"></div>
				<div class="text-item"><CheckSvg /><span v-html="$t('pages.landing.white-lable.perfectFor.item1')"></span></div>
				<div class="text-item"><CheckSvg /><span v-html="$t('pages.landing.white-lable.perfectFor.item2')"></span></div>
				<div class="text-item"><CheckSvg /><span v-html="$t('pages.landing.white-lable.perfectFor.item3')"></span></div>
				<div class="text-item"><CheckSvg /><span v-html="$t('pages.landing.white-lable.perfectFor.item4')"></span></div>
			</div>
		</div>
		<div class="button-group">
			<Button
			:buttonName="$t('pages.landing.white-lable.btnContact')"
			buttonType="main"
			@onClick="redirectToContacts()"
			/>
			<Button
			:buttonName="$t('pages.landing.white-lable.btnFeedback')"
			buttonType="second"
			@onClick="redirectToFeedback()"
			/>
		</div>
	</section>
</template>

<script>
	import { defineComponent } from 'vue'
	import Button from "@/components/Button.vue"
	import CheckSvg from "@/components/svg/landing/check.vue"
	import { useI18n } from 'vue-i18n'

	export default defineComponent({
    name: 'WhiteLabel section',
    components: {
		Button,
		CheckSvg
    },
    setup() {
		const { t } = useI18n();
		const redirectToContacts = () => {
			window.open('//shop.united.network/contact-us', '_blank');
		}

		const redirectToFeedback = () => {
			window.open('//feedback.united.network', '_blank');
		}

      	return { redirectToContacts, redirectToFeedback }
    },
	})
</script>

<style scoped lang="scss">
	#white-label {
		.title {
			font-size: clamp(32px, calc(33px + (61 - 33) * (100vw - 700px)/(1100 - 700)), 62px);
			font-weight: 600;
		}
		.text-group {
			width: 90%;
			margin-top: 24px;
		}
		.gride-group {
			width: 100%;
			
			.text-title {
				color: $color-white;
				text-align: left;
				font-weight: 600;
				margin-bottom: 12px;
			}

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

		.button-group {
			margin-top: 10vw;
			display: flex;
			flex-direction: column;

			.buttonSecond {
				margin-top: 12px;
			}
		}

		@media (min-width: 480px) {
			.title {
				margin-top: 24px;
			}
			.text-group, .section-image, .button-group {
				margin-top: 48px;
			}
   	 	}

		@media (min-width: 700px) {
			width: 600px;

			.title {
				flex-direction: row;
			}

			.button-group {
				flex-direction: row;
				flex-basis: 100%;
				width: 90%;

				button {
					margin: 0 6px;
					flex-basis: 50%;
				}

				.buttonSecond {
					margin-top: 0;
				}
			}

			.gride-group {
				display: flex;
				flex-wrap: wrap;
				width: 100%;
				margin-top: 24px;

				.text-group {
					display: flex;
					flex-direction: column;
					margin: 1%;
					flex: 0 0 calc(38% - 2px);
				}

				.gride-item {
					display: flex;
					flex-direction: column;
					align-items: center;
					margin: 1%;
					flex: 0 0 calc(38% - 2px);
				}

				.cross-Border-img {
					position: absolute;
					width: 200px;
					bottom: 0;
					left: -140px;
					@include transforma(rotate(-15deg));
				}
				.gasless-transactions-img {
					position: absolute;
					width: 400px;
					bottom: -130px;
					right: -290px;
					@include transforma(rotate(-25deg));
				}
			}
		}
	}
</style>