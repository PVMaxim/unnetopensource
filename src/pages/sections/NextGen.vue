<template>
	<section id="next-gen" class="container-main round-background">
		<div class="gradient"></div>
		<LandingBgNextGen class="bg-bubble" />
		<template v-if="windowSize < 700">
		<LogoShortSvg class="logo" />
		<div class="title">
			<div v-html="$t('pages.landing.next-gen.title')"></div>
			<div class="text-orange" v-html="$t('pages.landing.next-gen.titleHighlight')"></div>
		</div>
		<div class="section-image mobile">
			<CardUN />
		</div>
		<div class="button-group">
			<Button
				:buttonName="$t('pages.landing.next-gen.btnConnect')"
				buttonType="main"
				@onClick="redirectToWallet()"
			/>
			<Button
				:buttonName="$t('pages.landing.next-gen.btnOrder')"
				buttonType="second"
				@onClick="redirectToShop()"
			/>
		</div>
		<div class="text-group text-gray mtds" v-html="$t('pages.landing.next-gen.description')"></div>
		</template>
		<template v-else>
			<div class="left-group">
				<div class="logo-group">
					<LogoShortSvg class="logo" />
					<Logo class="logo-text" />
				</div>
				<div class="title">
					<div v-html="$t('pages.landing.next-gen.title')"></div>
					<div class="text-orange" v-html="$t('pages.landing.next-gen.titleHighlight')"></div>
				</div>
				<div class="text-group text-gray mtds" v-html="$t('pages.landing.next-gen.description')"></div>
				<div class="button-group">
					<Button
						:buttonName="$t('pages.landing.next-gen.btnConnect')"
						buttonType="main"
						@onClick="redirectToWallet()"
					/>
					<Button
						:buttonName="$t('pages.landing.next-gen.btnOrder')"
						buttonType="second"
						@onClick="redirectToShop()"
					/>
				</div>
			</div>
			<div class="section-image right-group">
				<CardUN />
			</div>
		</template>
	</section>
</template>

<script>
	import { defineComponent, ref, onMounted } from 'vue'
	import { useRouter } from 'vue-router'
	import Button from "@/components/Button.vue"
	import Logo from '@/components/svg/logo.vue';
	import LogoShortSvg from "@/components/svg/logoshort.vue"
	import CardUN from "@/components/svg/cardUN.vue"
	import LandingBgNextGen from "@/components/svg/landing/landingBgNextGen.vue"
	import { useI18n } from 'vue-i18n'

	export default defineComponent({
    name: 'NextGen section',
	props: {
		windowSize: {
			type: [Number,null],
			required: false,
		},
  	},
    components: {
		Logo,
		Button,
		LogoShortSvg,
		CardUN,
		LandingBgNextGen
    },
    setup() {
		const router = useRouter();
		const scrollPosition = ref(0);
		const rotatex = ref('30deg');
		const rotatey = ref('30deg');
		const rotatez = ref('-20deg');
		const translatex = ref('30px');

		const onScroll = (e) => {
			rotatex.value = e.target.scrollTop > 120 ? 0 : 30 - e.target.scrollTop / 4;
			rotatey.value = e.target.scrollTop > 120 ? 0 : 30 - e.target.scrollTop / 4;
			rotatez.value = e.target.scrollTop > 120 ? 0 : -20 + e.target.scrollTop / 4;
			translatex.value = e.target.scrollTop > 120 ? 0 : 30 - e.target.scrollTop / 4;

			rotatex.value = rotatex.value > 30 ? '30deg' : `${rotatex.value}deg`;
			rotatey.value = rotatey.value > 30 ? '30deg' : `${rotatey.value}deg`;
			rotatez.value = rotatez.value > 0 ? '0deg' : `${rotatez.value}deg`;
			translatex.value = translatex.value > 30 ? '30px' : `${translatex.value}px`;

		}

		onMounted(() => {
			window.addEventListener('scroll', onScroll, true)
		})

		const redirectToWallet = () => {
			router.push({ name: 'authorization' });
		}

		const redirectToShop = () => {
			window.open('//shop.united.network/products/nfc-card-wallet', '_blank');
		}

      return { redirectToWallet, redirectToShop, onScroll, scrollPosition, rotatex, rotatey, rotatez, translatex }
    },
	})
</script>

<style scoped lang="scss">
	#next-gen {
		.bg-bubble {
			position: absolute;
			top: -20%;
			left: initial;
			height: 140%;
			opacity: .7;
			z-index: 1;
		}

		.logo-group {
			display: flex;
			flex-direction: row;
			align-items: center;
		}
		.logo {
			height: 32px;
			width: 32px;
		}

		.logo-text {
			height: 32px;
			margin-left: 7px;
		}

		.title {
			font-size: $fontSizeTitle;
			margin-top: 5vw;
		}

		.text-group {
			font-size: $fontSizeTextBig;
			}

		.section-image {
			width: 100%;
			display: flex;
			justify-content: center;

			&.mobile {
				margin: 36px 0 24px 0;
			}

			&.right-group {
				svg {
					position: relative;
					width: 85%;
				}
			}

			svg {
			}

			.united-network-card {
				position: relative;
				width: 90%;
				right: -15%;
				@include transforma(rotate(5deg));
				-webkit-animation: tilt 12s ease infinite;
				animation: tilt 12s ease infinite;
				image-rendering: optimizequality;

				&::after {
					content: "";
					background: none, none, linear-gradient(125deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.4) 0.1%, rgba(255, 255, 255, 0) 60%);
					background-size: 200% 200%;
					mix-blend-mode: hard-light;
					-webkit-animation: bg var(--duration) ease infinite;
					animation: bg 12s ease infinite;
				}

				@keyframes tilt {
					0% { transform: translate3d(0, 0, 0.01px) rotateY(-20deg) rotateX(5deg) skew(5deg, -30deg); }
					50% { transform: translate3d(0, 0, 0.01px) rotateY(20deg) rotateX(5deg) skew(15deg, -20deg); }
					100% { transform: translate3d(0, 0, 0.01px) rotateY(-20deg) rotateX(5deg) skew(5deg, -30deg); }
				}

				@keyframes bg {
					0% { background-position: 50% 50%, calc(50% + 1px) calc(50% + 1px), 0% 50%; }
					50% { background-position: 50% 50%, calc(50% - 1px) calc(50% - 1px), 100% 50%; }
					100% { background-position: 50% 50%, calc(50% + 1px) calc(50% + 1px), 0% 50%; }
				}
			}
			&.right-group {
				img {
					position: relative;
					width: 130%;
					right:-30%;
					margin: 18px 0;
					@include transforma(rotate(-5deg));
				}
			}
		}

		.button-group {
			display: flex;
			flex-direction: column;
			z-index: 1;

			button {
				margin-top: 12px;
			}
		}

		@media (min-width: 480px) {
			.title {
				margin-top: 24px;
			}

			.section-image{
				svg {
					width: 70%;
					right: -7%;
				}
			} 

			.button-group {
				margin-top: -24px;
			}

			.text-group {
				margin-top: 48px;
			}
   	 	}
	}

	@media (min-width: 700px) {
		main {
			#next-gen {
				flex-direction: row;
				align-items: stretch;

				.bg-bubble {
					left: 0;
				}

				.title {
					text-align: left;
				}

				.text-group {
					text-align: left;
				}

				.button-group {
					flex-direction: row;
					flex-basis: 100%;
					margin: 24px 0 0 0;

					button {
						margin: 0 6px;
						flex-basis: 50%;
					}
				}

				.united-network-card {
					width: 100%;
				}
			}
		}
	}
</style>