<template>
	<section id="next" class="container-main">
		<div class="title mt-24">
			<div v-html="$t('pages.landing.next.title')"></div>
			<div class="text-orange second-word" v-html="$t('pages.landing.next.titleHighlight')"></div>
		</div>
		<div class="text-group text-gray mt-24" v-html="$t('pages.landing.next.description')"></div>
		<div class="gride-group mt-24">
			<img v-if="windowSize > 700" class="cross-Border-img" :src=setupYourCardBigImg :alt="$t('pages.landing.next.grid2.title')" loading="lazy">
			<img v-if="windowSize > 700" class="gasless-transactions-img" :src=nextGenHardwareWalletBigImg :alt="$t('pages.landing.next.grid1.title')" loading="lazy">
			<div class="gride-item round-background gradient-border gradient-border">
				<div class="gradient-left"></div>
				<div class="gride-title text-white">
					<div class="gride-icon">
						<GaslessSvg />
					</div>
					<div v-html="$t('pages.landing.next.grid1.title')"></div>
				</div>
				<div class="gride-text" v-html="$t('pages.landing.next.grid1.text')"></div>
			</div>
			<div class="gride-item round-background gradient-border gradient-border">
				<div class="gradient-left"></div>
				<div class="gride-title text-white">
					<div class="gride-icon">
						<BorderSvg />
					</div>
					<div v-html="$t('pages.landing.next.grid2.title')"></div>
				</div>
				<div class="gride-text" v-html="$t('pages.landing.next.grid2.text')"></div>
			</div>
			<div class="gride-item round-background gradient-border">
				<div class="gradient-left"></div>
				<div class="gride-title text-white">
					<div class="gride-icon">
						<FinancialSvg />
					</div>
					<div v-html="$t('pages.landing.next.grid3.title')"></div>
				</div>
				<div class="gride-text" v-html="$t('pages.landing.next.grid3.text')"></div>
			</div>
			<div class="gride-item round-background gradient-border">
				<div class="gradient-left"></div>
				<div class="gride-title text-white">
					<div class="gride-icon">
						<BankSvg />
					</div>
					<div v-html="$t('pages.landing.next.grid4.title')"></div>
				</div>
				<div class="gride-text" v-html="$t('pages.landing.next.grid4.text')"></div>
			</div>
		</div>
	</section>
</template>

<script>
	import { defineComponent } from 'vue';
	import GaslessSvg from "@/components/svg/landing/gasless.vue";
	import BorderSvg from "@/components/svg/landing/border.vue";
	import FinancialSvg from "@/components/svg/landing/financial.vue";
	import BankSvg from "@/components/svg/landing/bank.vue";
	import { useI18n } from 'vue-i18n';

	export default defineComponent({
    name: 'NextGen section',
	props: {
		windowSize: {
			type: [Number,null],
			required: false,
		},
  	},
    components: {
		GaslessSvg,
		BorderSvg,
		FinancialSvg,
		BankSvg
    },
    setup() {
		const { t } = useI18n();
		const setupYourCardBigImg = new URL(`@/assets/images/setup-your-card-big.png`, import.meta.url).href;
		const nextGenHardwareWalletBigImg = new URL(`@/assets/images/next-gen-hardware-wallet-big.png`, import.meta.url).href;
      return { setupYourCardBigImg, nextGenHardwareWalletBigImg }
    },
	})
</script>

<style scoped lang="scss">
	#next {
		.title {
			display: flex;
			flex-direction: column;
			align-items: center;
			font-size: clamp(32px, calc(33px + (61 - 33) * (100vw - 700px)/(1100 - 700)), 62px);
			font-weight: 600;
		}
		.gride-group {
			position: relative;
			text-align: left;
			color: rgba($color-white, .5);

			.gride-item {
				margin: 5% 0;
				.gride-title {
					display: flex;
					flex-direction: row;
					align-items: center;
					font-size: 18px;
					font-weight: 600;

					.gride-icon {
						display: flex;
						justify-content: center;
						align-items: center;
						width: 36px;		
						height: 36px;
						background-color: $color-black-17;
						border-radius: 50%;		
						margin-right: 12px;
					}

					svg {
						height: 16px;
						width: 16px;
					}
				}

				.gride-text {
					margin-top: 12px;
				}
			}
		}

		@media (min-width: 480px) {
			.title {
				margin-top: 24px;
			}
			.text-group, .section-image, .button-group, .gride-group {
				margin-top: 48px;
			}
   	 	}

		@media (min-width: 700px) {
			width: 600px;

			.title {
				flex-direction: row;

				.second-word {
					margin-left: 12px;
				}
			}

			.gride-group {
				display: flex;
				flex-wrap: wrap;

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