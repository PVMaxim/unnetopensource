<template>
	<section id="innovative-features" class="container-main">
		<div class="gradient"></div>
		<div class="title">
			<div class="text-orange">
				<span v-html="$t('pages.landing.innovative.title')"></span> 
				<span class="text-white" v-html="$t('pages.landing.innovative.titleHighlight')"></span>
			</div>
		</div>
		<div class="gride-group mtds">
			<div class="gride-item round-background gradient-border">
				<div class="gradient"></div>
				<div class="gride-icon">
					<WalletSvg />
				</div>
				<div class="gride-text" v-html="$t('pages.landing.innovative.wallet')"></div>
			</div>
			<div class="gride-item round-background gradient-border">
				<div class="gradient"></div>
				<div class="gride-icon">
					<IintegrationsSvg />
				</div>
				<div class="gride-text text-white" v-html="$t('pages.landing.innovative.card')"></div>
			</div>
			<div class="gride-item round-background gradient-border">
				<div class="gradient"></div>
				<div class="gride-icon">
					<P2pSvg />
				</div>
				<div class="gride-text" v-html="$t('pages.landing.innovative.p2p')"></div>
			</div>
			<div class="gride-item round-background gradient-border">
				<div class="gradient"></div>
				<div class="gride-icon">
					<AppSvg />
				</div>
				<div class="gride-text" v-html="$t('pages.landing.innovative.app')"></div>
			</div>
			<div class="gride-item round-background gradient-border">
				<div class="gradient"></div>
				<div class="gride-icon">
					<FidoSvg />
				</div>
				<div class="gride-text" v-html="$t('pages.landing.innovative.fido')"></div>
			</div>
			<div class="gride-item round-background gradient-border">
				<div class="gradient"></div>
				<div class="gride-icon">
					<Web3Svg />
				</div>
				<div class="gride-text" v-html="$t('pages.landing.innovative.web3')"></div>
			</div>
		</div>
	</section>
</template>

<script>
	import { defineComponent } from 'vue';
	import WalletSvg from "@/components/svg/landing/wallet.vue";
	import TransactionSvg from "@/components/svg/landing/transaction.vue";
	import P2pSvg from "@/components/svg/landing/p2p.vue";
	import AppSvg from "@/components/svg/landing/app.vue";
	import PosSvg from "@/components/svg/landing/pos.vue";
	import IintegrationsSvg from "@/components/svg/landing/integrationsIcon.vue";
	import FidoSvg from "@/components/svg/landing/fidoIcon.vue";
	import Web3Svg from "@/components/svg/landing/web3Icon.vue";
	import { useI18n } from 'vue-i18n';
	
	export default defineComponent({
    name: 'InnovativeFeatures section',
    components: {
		WalletSvg,
		TransactionSvg,
		P2pSvg,
		AppSvg,
		PosSvg,
		IintegrationsSvg,
		FidoSvg,
		Web3Svg
    },
    setup() {
      const { t } = useI18n();
      return { }
    },
	})
</script>

<style scoped lang="scss">
	#innovative-features {
		padding: 0px;
		width: 100%;
		.title {
			font-size: clamp(32px, calc(33px + (61 - 33) * (100vw - 700px)/(1100 - 700)), 62px);
		}
		.gride-group{
			display: flex;
			flex-wrap: wrap;
			width: 100%;

			.gride-item {
				display: flex;
				flex-direction: column;
				align-items: center;
				margin: 2.5%;
				flex: 0 0 calc(35% - 2px);

				&.full {
					flex: 0 0 85%;
				}
			}

			.gride-text {
				margin-top: 12px;
				text-align: center;
			}

			.gride-icon {
				width: 64px;
				height: 64px;
				border-radius: 50%;
				background-color: $color-black;
				display: flex;
				justify-content: center;
				align-items: center;

				svg {
					width: 40%;
				}
			}

		}

		@media (min-width: 480px) {
			.title {
				margin-top: 24px;
			}
			.gride-group {
				margin-top: 48px;
			}
   	 	}
	}
	@media (min-width: 700px) {
		main {
			#innovative-features {
				width: 600px;

				.gride-group {
					.gride-item {
						display: flex;
						flex-direction: column;
						align-items: center;
						margin: 1%;
						flex: 0 0 calc(21.33% - 2px);
					}
				}
			}
		}
	}
</style>