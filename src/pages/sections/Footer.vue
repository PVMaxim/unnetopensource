<template>
	<footer class="footer">
		<div class="footer-group round-background">
			<LogoText class="footerLogo"/>
			<div class="links-group">
				<div class="footer-menu">
					<a v-if="windowSize > 500" href="https://feedback.united.network/" target="_blank">{{ $t('pages.landing.footer.feedback') }}</a>
					<a v-if="windowSize > 500" href="//shop.united.network/products/nfc-card-wallet" target="_blank">{{ $t('pages.landing.footer.orderCard') }}</a>
					<a href="//united.network/privacy/terms-of-use.pdf" target="_blank">{{ $t('pages.landing.footer.terms') }}</a>
					<a href="//united.network/privacy/privacy-policy.pdf" target="_blank">{{ $t('pages.landing.footer.privacy') }}</a>
				</div>
			</div>
			<div class="social-links">
				<a href="https://x.com/UN_wallet" target="_blank">
					<XTwitterLogo />
				</a>
				<a href="https://t.me/UnitedNetworkWallet" target="_blank">
					<TelegramLogo />
				</a>
			</div>
		</div>
		<div class="copyright">
			© {{new Date().getUTCFullYear()}} United Network. All rights reserved.
		</div>
	</footer>
</template>

<script>
	import { defineComponent } from 'vue';
	import { useI18n } from 'vue-i18n';
	import LogoText from "@/components/svg/logoText.vue"
	import XTwitterLogo from "@/components/svg/xtwitter.vue"
	import TelegramLogo from "@/components/svg/telegram.vue"

	export default defineComponent({
    name: 'Footer section',
	props: {
		windowSize: {
			type: [Number,null],
			required: false,
		},
  	},
    components: {
		LogoText,
		XTwitterLogo,
		TelegramLogo
    },
    setup() {
      const { t } = useI18n();
      return { }
    },
	})
</script>

<style scoped lang="scss">
	footer {
		margin-top: 10vw;
		display: flex;
		flex-direction: column;
		width: 100%;

		.footer-group {
			display: flex;
			flex-direction: row;
			justify-content: space-between;

			.footerLogo {
				width: 40%;
			}

			.links-group {
				display: flex;
				width: 100%;
			}

			.footer-menu {
				display: flex;
				flex-direction: column;
				flex-wrap: wrap;
				align-content: flex-start;
				align-items: center;
				padding: 0 5%;
				width: 100%;

				a {
					margin-top: 6px;
					text-wrap: nowrap;
					width: 50%;
					text-align: center;
				}
			}
		}

		.social-links {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			svg {
				margin: 0 12px;
				height: 14px;
				margin-top: 6px;
			}
		}

		.copyright {
			margin-top: 12px;
			margin-bottom: 12px;
			font-size: 12px;
			text-align: center;
			color: rgba($color-white, .5);
		}

		@media (min-width: 480px) {
			margin-top: 48px;
			.footer-group {
				.footerLogo {
					width: 25%;
				}

				.footer-menu {
					display: flex;
					flex-direction: row;
					padding: 0 5%;
				}
			}
		}

		@media (min-width: 700px) {
			.footer-group {
				.footerLogo {
					width: 120px;
				}

				.social-links {
					flex-direction: row;
					width: 30px;
				}
			}
		}
	}
</style>