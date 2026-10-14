<template>
  <main>
    <div class="container-main">
      <Loading v-if="isLoading" :messageLoad = messageLoad :titleLoad = titleLoad />
      <Panel  v-else-if="error"  
        :title=errorTitle 
        :subtitle=errorSubtitle
        :iconUrl=errorImg
        :buttonClick=errorHandler
        :buttonName="$t('button.ok')" />
      <!-- <Panel  v-else  
        title="Card authorization" 
        subtitle="Press a button and tap your card to authorize your account"
        :buttonClick=authorizationHandler
        buttonName="Authorization" 
        :buttonSubClick=restoreHandler
        buttonSubName="Restore card" 
      > -->
      <div v-show="!error && !isLoading" class="container-app">
        <!-- <div class="logo-group">
					<LogoShortSvg class="logo" />
					<Logo class="logo-text" />
				</div> -->
        <div></div>
        <div class="slide-box">
        <div class="embla" ref="slideImageRef">
          <div class="embla__container">
            <div class="embla__slide card-box">
              <NfcCardSvg />
            </div>
            <div class="embla__slide card-box next-init">
              <SecurelySvg />
            </div>
            <div class="embla__slide card-box">
              <YourKeysSvg />
            </div>
            <div class="embla__slide card-box">
              <MultiBlockchainSvg />
            </div>
            <!-- <div class="embla__slide card-box">
              <CrosschainSvg />
            </div> -->
            <div class="embla__slide card-box">
              <WalletConnectSvg />
            </div>
          </div>
        </div>
        <div ref="dotsContainer" class="dots-container">
          <div v-for="dot, index in dotsCount" :key="index" class="dot" :class="{active: index === 0}" @click.prevent="scrollTo(index)"></div>
        </div>
        <div class="embla" ref="slideTextRef">
          <div class="embla__container">
            <div class="embla__slide card-text">
              <div class="card-title">
                {{ $t('pages.authorization.slide1.title') }}
              </div>
              <div class="card-description">
                {{ $t('pages.authorization.slide1.description') }}
              </div>
            </div>
            <div class="embla__slide card-text next-init">
              <div class="card-title">
                {{ $t('pages.authorization.slide2.title') }}
              </div>
              <div class="card-description">
                {{ $t('pages.authorization.slide2.description') }}
              </div>
            </div>
            <div class="embla__slide card-text">
              <div class="card-title">
                {{ $t('pages.authorization.slide3.title') }}
              </div>
              <div class="card-description">
                {{ $t('pages.authorization.slide3.description') }}
              </div>
            </div>
            <div class="embla__slide card-text">
              <div class="card-title">
                {{ $t('pages.authorization.slide4.title') }}
              </div>
              <div class="card-description">
                {{ $t('pages.authorization.slide4.description') }}
              </div>
            </div>
            <!-- <div class="embla__slide card-text">
              <div class="card-title">
                Сrosschain crypto swaps
              </div>
              <div class="card-description">
                Seamless asset exchange across multiple blockchains
              </div>
            </div> -->
            <div class="embla__slide card-text">
              <div class="card-title">
                {{ $t('pages.authorization.slide5.title') }}
              </div>
              <div class="card-description">
                {{ $t('pages.authorization.slide5.description') }}
              </div>
            </div>
          </div>
        </div>
        </div>
        <!-- <div class="">
          <div class="slidePrev" @click=buttonClickPrev>Prev {{ buttonClickPrevCan }}</div>
          <div class="slideNext" @click=buttonClickNext>Next {{ buttonClickNextCan }}</div>
        </div> -->
        <div class="button-group">
          <!-- <button class="button-main submit subButton main" @click=authorizationHandler()>Authorization</button>
          <button class="button-main button-second sub subButton main" @click=restoreHandler()>Restore card</button> -->
          <Button
            :buttonName="$t('pages.authorization.connectCard')"
            buttonType="main"
            buttonRound="round12"
            @onClick="authorizationHandler()"
          />
          <Button
            :buttonName="$t('pages.authorization.restoreCard')"
            buttonType="transparent"
            @onClick="restoreHandler()"
          />
        </div>
      </div>
      <div class="panel" v-show="nfcIsActive">
        <NFCHandlerWindow 
          ref="nfcHandlerWindow"
          :title="$t('nfcHandler.touchYourCard')"
          :subTitle="$t('nfcHandler.holdYourCard')"
          v-model:isActive=nfcIsActive
          @onCancel="isLoading=false"
        />
      </div>
    </div>
  </main>
</template>

<script>
  import { ref, computed, onMounted, onErrorCaptured, watchEffect } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useStore } from 'vuex';
  import { useRouter, useRoute } from 'vue-router';
  import { useEventsBus } from '@/plugins/eventBus.js';
  import { CmdGetInfo, parsePublicKeyHexList }  from '../api/card-io';
  import { setUniSettings }  from '../api/global-settings';
  import { getWallet, getStorePrefix } from '../api/ApiHandler';
  import { isWebViewApp, getErrorMessage, isTheSamePublicKey } from '@/api/sub-utils';
  import Loading from '@/components/Loading.vue';
  import Panel from '@/components/Panel.vue';
  import NFCHandlerWindow from '@/components/NFCHandlerWindow.vue';
  import { isCardRegistered, isCardIsNew, isCardBroken, checkAndSetVersionFromUrl } from '../api/check-guards';
  import emblaCarouselVue from '../plugins/carousel/index';
  import Button from "@/components/Button.vue";

  import NfcCardSvg from "@/components/svg/intro/nfc-card.vue";
  import SecurelySvg from "@/components/svg/intro/securely.vue";
  import YourKeysSvg from "@/components/svg/intro/yor-keys.vue";
  import MultiBlockchainSvg from "@/components/svg/intro/multi-blockchain.vue";
  import CrosschainSvg from "@/components/svg/intro/crosschain.vue";
  import WalletConnectSvg from "@/components/svg/intro/wallet-connect.vue";

  export default {
    name: 'Authorization page',
    layout: 'Dashboard',
    components: {
      Loading,
      Panel,
      NFCHandlerWindow,
      NfcCardSvg,
      SecurelySvg,
      YourKeysSvg,
      MultiBlockchainSvg,
      CrosschainSvg,
      WalletConnectSvg,
      Button
    },
    setup() {
      const { t } = useI18n();
      const store = useStore();
      const isLoading = ref(false);
      const nfcIsActive = ref(false);
      const error = ref(false);
      const titleLoad = ref(t('pages.authorization.status.wait'));
      const messageLoad = ref(t('pages.authorization.status.authorizing'));
      const errorTitle = ref(t('pages.authorization.errors.title'));
      const errorSubtitle = ref(t('pages.authorization.errors.subtitle'));
      const route = useRoute();
      const router = useRouter();
      const publicKeyCard = ref(undefined);
      const accountAddress = ref(undefined);
      const errorImg = new URL(`@/assets/images/errorcode.svg`, import.meta.url).href;

      const [slideImageRef, slideImageApi] = emblaCarouselVue({ containScroll: false, align: 'center' });
      const [slideTextRef, slideTextApi] = emblaCarouselVue({ containScroll: false, align: 'center' });
      const dotsContainer = ref();

      const buttonClickNextCan = ref(null);
      const buttonClickPrevCan = ref(null);
      const dotsCount = ref(null);
      const slideActive = ref(null);
      const slidePrev = ref(null);
      const slideNodes = ref(null);
      const textNodes = ref(null);

      const nfcHandlerWindow = ref(NFCHandlerWindow);

      const toggleOptions = computed(() => { return {
        layout: {
          color: 'rgb2(255, 255, 255, .6)',
          backgroundColor: 'rgba(0,0,0,0)',
          selectedColor: 'rgba(17, 17, 17, 1)',
          selectedBackgroundColor: 'rgb(255, 152, 0)',
          borderColor: 'none',
          fontWeightSelected: 'normal',
          squareCorners: true,
          noBorder: false
        },
        size: {
          fontSize: 1.5,
          height: 3.25,
          padding: 0.5,
          width: 10
        },
        config: {
          delay: 0.4,
          preSelected: store.state.settings.cardReaderPriority,
          disabled: false,
          items: [
            { name: 'nfc', value: "nfc",  width: '60px', padding: '8px 12px' },
            { name: 'fido', value: "fido", width: '60px', padding: '8px 12px' }
          ]
        }
      }});

      const scrollTo = (index) => {
          slideImageApi.value?.scrollTo(index)
          scrollTo2(index)
        }

        const scrollTo2 = (index) => {
          slideTextApi.value?.scrollTo(index)
        }

      const onSelect = () => {
          console.log(`onSelect`);
          slideNodes.value[1]?.classList.remove('next-init');
          textNodes.value[1]?.classList.remove('next-init');
          dotsContainer.value.children[0]?.classList.remove('active');
          buttonClickPrevCan.value = slideImageApi.value.canScrollPrev();
          buttonClickNextCan.value = slideImageApi.value.canScrollNext();
          dotsCount.value = slideImageApi.value.scrollSnapList();
          slideActive.value = slideImageApi.value.selectedScrollSnap();
          slidePrev.value = slideImageApi.value.previousScrollSnap();
          scrollTo2(slideActive.value);
          slideNodes.value[slideActive.value + 1]?.classList.add('slide-next');
          slideNodes.value[slidePrev.value + 1]?.classList.remove('slide-next');
          slideNodes.value[slideActive.value - 1]?.classList.add('slide-prev');
          slideNodes.value[slidePrev.value - 1]?.classList.remove('slide-prev');

          textNodes.value[slideActive.value + 1]?.classList.add('slide-next');
          textNodes.value[slidePrev.value + 1]?.classList.remove('slide-next');
          textNodes.value[slideActive.value - 1]?.classList.add('slide-prev');
          textNodes.value[slidePrev.value - 1]?.classList.remove('slide-prev');

          dotsContainer.value.children[slideActive.value].classList.add('active');
          dotsContainer.value.children[slidePrev.value].classList.remove('active');
        }

        const onReInit = () => {
          buttonClickPrevCan.value = slideImageApi.value.canScrollPrev();
          buttonClickNextCan.value = slideImageApi.value.canScrollNext();
          dotsCount.value = slideImageApi.value.scrollSnapList();
          slideActive.value = slideImageApi.value.selectedScrollSnap();
          slidePrev.value = slideImageApi.value.previousScrollSnap();
        }

        const onSelect2 = () => {
          slideNodes.value[1]?.classList.remove('next-init');
          textNodes.value[1]?.classList.remove('next-init');
          dotsContainer.value.children[0]?.classList.remove('active');
          buttonClickPrevCan.value = slideTextApi.value.canScrollPrev();
          buttonClickNextCan.value = slideTextApi.value.canScrollNext();
          dotsCount.value = slideTextApi.value.scrollSnapList();
          slideActive.value = slideTextApi.value.selectedScrollSnap();
          slidePrev.value = slideTextApi.value.previousScrollSnap();
          scrollTo(slideActive.value);
          slideNodes.value[slideActive.value + 1]?.classList.add('slide-next');
          slideNodes.value[slidePrev.value + 1]?.classList.remove('slide-next');
          slideNodes.value[slideActive.value - 1]?.classList.add('slide-prev');
          slideNodes.value[slidePrev.value - 1]?.classList.remove('slide-prev');

          textNodes.value[slideActive.value + 1]?.classList.add('slide-next');
          textNodes.value[slidePrev.value + 1]?.classList.remove('slide-next');
          textNodes.value[slideActive.value - 1]?.classList.add('slide-prev');
          textNodes.value[slidePrev.value - 1]?.classList.remove('slide-prev');

          dotsContainer.value.children[slideActive.value].classList.add('active');
          dotsContainer.value.children[slidePrev.value].classList.remove('active');
        }

        const onReInit2 = () => {
          buttonClickPrevCan.value = slideTextApi.value.canScrollPrev();
          buttonClickNextCan.value = slideTextApi.value.canScrollNext();
          dotsCount.value = slideTextApi.value.scrollSnapList();
          slideActive.value = slideTextApi.value.selectedScrollSnap();
          slidePrev.value = slideTextApi.value.previousScrollSnap();
        }

      const updatePriorityCard = async(event) => {
        await store.dispatch('settings/setCardReaderPriority', event ).then(() => {
          }).catch((error) => {
            error.value = true;
            errorSubtitle.value = error;
            return;
          });
      }

      const restoreHandler = async() => {
        router.push({ name: 'restore-card' });
      }

      const authorizationHandler = async() => {
        isLoading.value = true;
        const resultPrepareNFC = ref(null);
        const resultAuth = ref(undefined);
        const resultPrepareAuthenticate = ref(undefined);
        
        messageLoad.value = t('pages.authorization.status.prepareSign');
        setUniSettings({ioMethod: store.state.settings.cardReaderPriority === 'fido' ? 'fido' : 'nfc'});
        try {
          resultPrepareNFC.value = await CmdGetInfo.buildRequest();
        } catch (err) {
          console.info('Error during NFC process', err);
          throw new Error(t('errors.authorizationError'),{ cause: {errorSubtitle: t('pages.authorization.errors.prepareError'), errorBody: typeof err === 'object' || typeof err === 'array' ? JSON.stringify(err) : err}});
        }

        if (!publicKeyCard.value) {
          messageLoad.value = t('pages.authorization.status.waitingSign');
          resultAuth.value = await nfcHandlerWindow.value?.nfcProgressHandler(resultPrepareNFC.value, CmdGetInfo, false);
          messageLoad.value = t('pages.authorization.status.verificationSign');
          console.log(`CmdGetInfo.parseResponse SUCCESS all: ${JSON.stringify(resultAuth.value)}`);
          messageLoad.value = t('pages.authorization.status.submitSign');
          publicKeyCard.value = resultAuth.value?.keys;
          if (resultAuth.value?.version) {
            store.dispatch('settings/setCardVersion',  resultAuth.value?.version ).then(() => {
              console.log(`settings/setCardVersion typeof: ${typeof resultAuth.value?.version} data ${JSON.stringify(resultAuth.value?.version)}`);
            }).catch((err) => {
              console.log(`settings/setCardVersion ERROR typeof: ${typeof err} data ${JSON.stringify(err)}`);
            });
          }
          if (resultAuth.value?.isNewCard !== undefined) {
            store.dispatch('user/setRegistered',  resultAuth.value?.isNewCard);
          }
        }

        isTheSamePublicKey(publicKeyCard.value);

        if (publicKeyCard.value !== null && publicKeyCard.value?.ioPublicKey) {
          store.dispatch('user/setPinPublicKey',  publicKeyCard.value?.ioPublicKey ).then(() => {
            console.log(`user/setPinPublicKey typeof: ${typeof publicKeyCard.value?.ioPublicKey} data ${JSON.stringify(publicKeyCard.value?.ioPublicKey)}`);
          });
        }

        store.dispatch('user/setPublicKeyCard',  publicKeyCard.value ).then(() => {
          console.log(`user/setPublicKeyCard typeof: ${typeof publicKeyCard.value} data ${JSON.stringify(publicKeyCard.value)}`);
        }).catch((err) => {
          throw new Error(t('errors.authorizationError'),{ cause: {errorBody: typeof err === 'object' || typeof err === 'array' ? JSON.stringify(err) : err}});
        });

        const prefix = getStorePrefix();

        if (isCardIsNew()) {
          router.push({ name: 'registration-card' });
          return;
        }
        if (!isCardIsNew() && !isCardBroken()) {
          try {
            accountAddress.value = await getWallet( store.state.user.publicKeyCard, true );
            console.log(`accountAddress.value typeof: ${typeof accountAddress.value} data ${JSON.stringify(accountAddress.value)}`);
          } catch(err) {
            throw new Error(t('errors.authorizationError'),{ cause: {errorSubtitle: t('pages.authorization.errors.walletError'), errorBody:err}});
          }

          store.dispatch('user/setAccountAddress',  accountAddress.value ).then(() => {
            console.log(`user/setAccountAddress typeof: ${typeof accountAddress.value} data ${JSON.stringify(accountAddress.value)}`);
          }).catch((err) => {
            throw new Error(t('errors.browserError'),{ cause: {errorSubtitle: t('pages.authorization.errors.processError'), errorBody: typeof err === 'object' || typeof err === 'array' ? JSON.stringify(err) : err}});
          });
        }

        if (isCardRegistered() && !isCardIsNew()) {
          router.push({ name: 'dashboard' });
          return;
        } else if (isCardBroken()) {
          throw new Error(t('errors.cardError'),{ cause: {errorSubtitle: t('pages.authorization.errors.validError')}});
        }
        isLoading.value = false;
       }

      useEventsBus().on('useAnotherCard', (payload) => {
        console.log(`ou touch another card. to use it, please Sign In"`);
        throw new Error(t('errors.cardError'),{ cause: {errorSubtitle: t('pages.authorization.errors.anotherCard')}});
      });

      const errorHandler = () => {
        publicKeyCard.value = undefined;
        accountAddress.value = undefined;
        error.value = false;
        errorTitle.value = t('pages.authorization.errors.title');
        errorSubtitle.value = t('pages.authorization.errors.subtitle');
        titleLoad.value = t('pages.authorization.status.wait');
        messageLoad.value = t('pages.authorization.status.authorizing');
        router.push({ name: 'authorization' });
      }

      const initCarusel = () => {   
        if (slideImageApi.value) {
          console.log(`enter initCarusel`)
          //dotsContainer.value.children[1]?.classList.add('active');
          slideNodes.value = slideImageApi.value.slideNodes();
          textNodes.value = slideTextApi.value.slideNodes();
          slideImageApi.value.on('select', onSelect)
                        .on('init', onReInit)
                        .on('reInit', onReInit)

          slideTextApi.value.on('select', onSelect2)
                        .on('init', onReInit2)
                        .on('reInit', onReInit2)
        }
      }
     
      watchEffect(() => {
        if ( isLoading.value === false && error.value === false && slideImageRef !== null && slideTextRef !== null ) {
          console.log(`initCarusel`);
          initCarusel();
        }
      });

      async function detectNfcCapabilities() {
        const result = {
          webNfc: 'NDEFReader' in window,
          webAuthn: !!window.PublicKeyCredential,
          webUsb: 'usb' in navigator,
        };

        if (result.webNfc) {
          try {
            const reader = new NDEFReader();
            await reader.scan();
            result.nfcAvailable = true;
          } catch {
            result.nfcAvailable = false;
          }
        }

        if (result.webAuthn) {
          const platform = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          result.platformAuthenticator = platform;
        }

        return result;
      }



      onMounted(() => {
        detectNfcCapabilities().then(console.log);
        checkAndSetVersionFromUrl(route.query);

        if (route.params.publicKey ) {
          try {
            publicKeyCard.value = parsePublicKeyHexList(route.params.publicKey);
            console.log(`route.params.publicKey: ${JSON.stringify(publicKeyCard.value)}`)
            console.log(`publicKeyCard secp256k1 66: data ${publicKeyCard.value.secp256k1}, all 0 ${/^[0]{66}$/.test(publicKeyCard.value.secp256k1)}, all 16bit ${/^[a-fA-F0-9]{66}$/.test(publicKeyCard.value.secp256k1)}`);
            console.log(`publicKeyCard ed25519 64: data ${publicKeyCard.value.ed25519}, all 0 ${/^[a-fA-F0-9]{64}$/.test(publicKeyCard.value.ed25519)}, all 16bit ${/^[a-fA-F0-9]{64}$/.test(publicKeyCard.value.ed25519)}`);
            authorizationHandler();
          } catch(err) {
            console.log(`key parsing fail: ${err}`)
          }
        }
        initCarusel();
        isLoading.value = false;
      });

      onErrorCaptured(async(err) => {
        const {title, message} = await getErrorMessage(err);
        error.value = true;
        errorTitle.value = title ?? t('pages.authorization.errors.title');
        errorSubtitle.value = message ?? t('pages.authorization.errors.subtitle');
        console.log(`errorBody = ${err?.cause?.errorBody}`);
        const messageConsole = err?.cause?.errorTitle ? `errorTitle: ${err?.cause?.errorTitle}, ` : null 
          + err?.cause?.errorSubtitle ? `errorSubtitle: ${err?.cause?.errorSubtitle}, ` : null
          + err?.cause?.errorBody ? typeof err?.cause?.errorBody === 'object' || typeof err?.cause?.errorBody  === 'array' ? `errorBody: ${JSON.stringify(err?.cause?.errorBody)}, ` : `errorBody: ${err?.cause?.errorBody}, ` : null;
        console.log(messageConsole);
        isLoading.value = false;
        return false;
      });

      return { isWebViewApp, isLoading, error, authorizationHandler, errorHandler, restoreHandler, toggleOptions, updatePriorityCard, 
        errorImg, nfcHandlerWindow, titleLoad, messageLoad, errorTitle, errorSubtitle, 
        slideImageRef, slideTextRef, buttonClickNextCan, buttonClickPrevCan, nfcIsActive, 
          dotsCount, slideActive, slidePrev, scrollTo, dotsContainer, slideImageApi, slideTextApi
      }
    },
  }
</script>

<style scoped lang="scss">
  .container-main {
    width: 90%;
    flex-direction: column;
  }
  .container-app {
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
  }

  .slide-box {
    width: 100%;
  }

  .embla {
    overflow: hidden;
  
    .embla__container {
      display: flex;
      touch-action: pan-y pinch-zoom;
      //margin-left: calc(1rem * -1);
    }
    .card-box {
      display: flex;
      flex: 0 0 50vw;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 50vw;
      max-width: 333px;
      max-height: 333px;
      transform: translate3d(0, 0, 0);
      @include transition(all .4s ease-in-out);
      min-width: 0;
      background: radial-gradient(72.6% 66.9% at 50.02% 0%, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 100%), #1C1C1C;
      box-shadow: inset 0px 0px 10px rgba(255, 255, 255, 0.06);
      border-radius: 32px;

      &.next-init, &.slide-next {
        @include transforma(rotate(5deg) scale(0.8) translateY(20px));
      }

      &.slide-prev {
        @include transforma(rotate(-5deg) scale(0.8) translateY(20px));
      }
    }

    .card-text {
      width: 90%;
      display: flex;
      flex: 0 0 70%;
      flex-direction: column;
      justify-content: flex-start;
      align-items: center;
      opacity: 1;
      @include transition(opacity .4s ease-in-out);

      &.next-init, &.slide-next {
        opacity: 0;
      }

      &.slide-prev {
        opacity: 0;
      }

      .card-title {
        font-size: 32px;
        margin-top: 2vh;
        color: $color-white;
        text-align: center;
        font-weight: 600;
      }

      .card-description {
        font-size: 18px;
        margin-top: 2vh;
        color: $color-black-136;
        text-align: center;
      }
    }
  }
  .dots-container {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    margin-top: 4vh;

    .dot {
      width: 3vw;
      height: 3vw;
      max-width: 18px;
      max-height: 18px;
      background-color: $color-black-60;
      border-radius: 50%;
      @include transition(all .4s ease-in-out);

      &:first-child, &:last-child {
        width: 1.5vw;
        height: 1.5vw;
        max-width: 9px;
        max-height: 9px;
      }

      &:not(:last-child) {
        margin-right: 2vw;
      }
      &.active {
        width: 3vw;
        height: 3vw;
        background-color: $color-white;
      }
    }
  }
  .button-group {
    width: 90%;
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    button {
      width: 100%;
      font-size: 14px;
    }

    .get-card {
      display: flex;
      flex-direction: row;
      
      .get-card-link {
        color: $color-orange;
        margin-left: 5px;

        &:hover{
          color: $color-orange-hover;
        }
      }
    }
  }
  .web-app {
    .button-group {
      margin-bottom: 42px;
    }
  }
</style>