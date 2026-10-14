<template>
  <div v-if="nfcWindow" class="nfc-window">
    <div class="top-box">
      <div class="chunk-box">
        <div class="text-gray">{{ $t('nfcHandler.transactionSignature') }}</div>
        <div class="chunk-data">
          <div class="chunk-index">
            {{chunkData?.chunkIndex}}
          </div>
          <div class="chunk-length text-gray">
            {{ $t('nfcHandler.of') }} {{chunkData?.chunkLength}}
          </div>
        </div>
      </div>
      <div class="progress-bar-box">
        <div class="progress-bar"></div>
      </div>
    </div>
    <div v-if="nfcListen" class="middle-box">
      <NfcPhoneIconSvg v-if="nfcListen" class="nfc-animation" />
    </div>
    <div v-else-if="!nfcListen && chunkLength > 1 && !nfcRetry" class="middle-box">
      <div class="success-sign">
        {{ $t('nfcHandler.successfullySigned') }}
      </div>
    </div>
    <div v-else class="middle-box">

    </div>
    <div class="bottom-box">
      <div class="attempt-number">{{attemptNumber}}</div>
      <div class="title">{{title}}</div>
      <div class="subtitle text-gray">{{subTitle}}</div>
    </div>
    <div v-if="countDown !== null" class="button-group">{{ $t('nfcHandler.pleaseWait', { seconds: countDown }) }}</div>
    <div v-else class="button-group">
      <Button v-if="!nfcListen && chunkLength > 1 && !nfcRetry"
        class="button-main"
        :buttonName="$t('button.continue')"
        buttonType="main"
        buttonRound="round12"
        @onClick="nextChunk()"
      />
      <Button v-if="nfcRetry"
        class="button-main"
        :buttonName="$t('button.retry')"
        buttonType="main"
        buttonRound="round12"
        @onClick="retryProgressChunk()" />
      <Button v-if="nfcListen"
        class="button-second"
        :buttonName="$t('button.cancel')"
        buttonType="second"
        buttonRound="round12"
        @onClick="windowCancel()"
      />
    </div>
  </div>
</template>

<script>
import { defineComponent, shallowRef, ref, watch, watchEffect, onUnmounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import {
  checkNfcSupport,
  checkFidoSupport,
  getHost
} from '@/api/ApiHandler';
import { isWebViewApp } from '@/api/sub-utils';
import { startAuthentication } from '@simplewebauthn/browser';
import { usePermission } from '@/plugins/utils/usePermission';
import { buildFidoRequest } from '@/api/fido';
import { buildNfcTagRequest}  from '@/api/nfc-tag';
import Button from '@/components/Button.vue';
import NfcPhoneIconSvg from '@/components/svg/nfcPhoneIcon.vue';
import { isMobileAndroidDevice, isMobileAppleDevice } from '@/plugins/checkDevice';

export default defineComponent({
  name: 'NFCHandlerWindow',
  emits: ['update:modelValue', 'onCancel', 'update:isActive', 'update:isLoading'],
  props: {
    modelValue: [String, null],
    title: {
      type: [String, null],
      default: null,
      required: false,
    },
    subTitle: {
      type: [String, null],
      default: null,
      required: false,
    },
    errorMessage: {
      type: [String,null],
      default: null
    },
    error: {
      type: [String, null],
      default: null,
      required: false,
    },
    isActive: {
      type: [Boolean],
      default: true,
    },
    isLoading: {
      type: [Boolean],
    },
  },
  components: {
    Button,
    NfcPhoneIconSvg,
  },
  setup(props, { emit }) {
    const { t } = useI18n();
    const store = useStore();
    const isChunk = ref(false);
    const isChunksProcessed = ref(false);
    const cardResponse = ref(null);
    const countDown = ref(null);
    const nfcWindow = ref(false);
    const nfcListen = ref(false);
    const nfcRetry = ref(false);
    const nfcLongRequest = ref(false);
    const subTitle  = ref(props.subTitle || t('nfcHandler.holdCardSubtitle'));
    const title  = ref(props.title || t('nfcHandler.touchCard'));
    const pinCode = ref(null);
    const expectedResponseSize = ref(null);
    let intervalWebApp = null
    const attemptNumber = ref(null);
    const resultStart = shallowRef(null);
    const fidoSupported = checkFidoSupport.value;
    const nfcSupported = checkNfcSupport.value;
    const nfcPermissionStatus = usePermission('nfc');
    const nfcAnimationImg = new URL(`@/assets/images/nfcAnimation.gif`, import.meta.url).href;
    const responseCardData = ref(null);
    const chunks = shallowRef(null);
    const chunkIndex = ref(0);
    const chunkLength = ref(0);
    const chunkData = computed(() => { return {
        "chunkLength" : chunkLength.value,
        "chunkIndex" : chunkIndex.value + 1,
       }
      });
    const maxRetries = ref(5);
    const retries = ref(0);
    const retryProgressChunk = async () => {
      // reset retry UI state and try again
      nfcRetry.value = false;
      nfcListen.value = true;
      console.log(`LOG_INFO 6: nfcListen - ${nfcListen.value}, nfcWindow - ${nfcWindow.value}, nfcRetry - ${nfcRetry.value}, chunkLength - ${chunkLength.value}`);
      await progressChunk();
    };
    const isExecuteNfcSequence = ref(true);
    const progress = computed(() => {
      const len = chunkData.value.chunkLength || 0;
      return len > 0
        ? `${Math.round((chunkData.value.chunkIndex / len) * 100)}%`
        : '100%';
    });
    const abortController = ref(new AbortController());

    const clearNfcData = () => {
      console.log(`click cleadNfcData`);
      cardResponse.value = null;
      pinCode.value = null;
      attemptNumber.value = null;
      nfcWindow.value = false;
      nfcListen.value = false;
      chunkIndex.value = 0;
      chunkLength.value = 0;
      chunks.value = null;
      resultStart.value = null;
      responseCardData.value = null;
      subTitle.value = props.subTitle;
      title.value = props.title;
      nfcLongRequest.value = false;
      expectedResponseSize.value = null;
      isChunk.value = false;
    }

    const base64url_encode = async (buffer) => {
    return btoa(Array.from(new Uint8Array(buffer), b => String.fromCharCode(b)).join(''))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    }

    const base64url_decode = async (value) => {
      const m = value.length % 4;
      return Uint8Array.from(atob(
          value.replace(/-/g, '+')
              .replace(/_/g, '/')
              .padEnd(value.length + (m === 0 ? 0 : 4 - m), '=')
      ), c => c.charCodeAt(0)).buffer
    }

    const closeAbortController = () => {
      if( !abortController.value.signal.aborted ) {
        console.log(`Stop timeout for blocking NFC tag`);
        abortController.value.abort("Idle timeout");
      }
    }

    const clearData = () => {
      console.log(`click clearData`);
      emit('update:isActive', false);
      clearNfcData();
      closeAbortController();
    }
    
    const windowCancel = () => {
      console.log(`click windowCancel`);
      emit('onCancel', true);
      emit('update:isActive', false);
      clearNfcData();
      closeAbortController();
    }

    const readNdefTag = async() => {
      console.log("Enter readNdefTag");
      return new Promise((resolve, reject) => {
        const ndef = new window.NDEFReader();
        const abortControllerReadNdef = new AbortController();
        const timeoutReadNdef = ref(null);

        console.log(`readNdefTag Init  NDEFReader = ${JSON.stringify(ndef)}`);
        console.log(`readNdefTag Init  abortControllerReadNdef = ${JSON.stringify(abortControllerReadNdef)}`);
        timeoutReadNdef.value = setTimeout(() => {
          abortControllerReadNdef.abort("Timeout");
          reject(new Error(t('errors.ndefReadTimeout')));
        }, 5000);
        console.log(`timeoutReadNdef  = ${JSON.stringify(timeoutReadNdef.value)}`);

        ndef.onreading = (event) => {
          clearTimeout(timeoutReadNdef.value);
          console.log(`timeoutReadNdef clearTimeout onreading = ${JSON.stringify(timeoutReadNdef.value)}`);
          abortControllerReadNdef.abort('Finished');
          resolve(event.message.records);
        };

        ndef.onreadingerror = (event) => {
          clearTimeout(timeoutReadNdef.value);
          console.log(`timeoutReadNdef clearTimeout onreadingerror = ${JSON.stringify(timeoutReadNdef.value)}`);
          reject(new Error(`${event}`));
        };

        ndef.scan({ signal: abortControllerReadNdef.signal })
          .catch((err) => {
            clearTimeout(timeoutReadNdef.value);
            console.log(`timeoutReadNdef clearTimeout scan = ${JSON.stringify(timeoutReadNdef.value)}`);
            reject(err);
          }
        );
      });
    }

    const writeNdefTag = async(ndefMessage) => {
      console.log("Enter writeNdefTag");
      const ndef = new window.NDEFReader();
      const abortControllerWriteNdef = new AbortController();
      const timeoutWriteNdef = ref(null);
      clearTimeout(timeoutWriteNdef.value);
      timeoutWriteNdef.value = setTimeout(() => abortControllerWriteNdef.abort(t('errors.ndefWriteTimeout')), 5000);

      const msg = {
        records: [ndefMessage],
      };

      try {
          await ndef.write(msg, { signal: abortControllerWriteNdef.signal });
      } finally {
          clearTimeout(timeoutWriteNdef.value);
          console.log(`timeoutWriteNdef clearTimeout scan = ${JSON.stringify(timeoutWriteNdef.value)}`);
      }
    }

    const executeNfcSequence = async (ndefMessage, expectedLength) => {
      console.log("Enter executeNfcSequence");
      console.log(`Writing message : length=${ndefMessage.length}, data ${JSON.stringify(new Uint8Array(expectedLength))}`);
      await writeNdefTag({
        recordType: "mime",
        mediaType: "application/octet-stream",
        data: new Uint8Array(ndefMessage),
      });

      console.log(`Writing dummy data`);
      await writeNdefTag({
        recordType: "text",
        data: new Uint8Array(expectedLength),
      });

      console.log(`Reading command result`);
      let records = await readNdefTag();
      console.log(`Result read : records=[${records.map((x) => x.recordType).join(",")}]`);

      for (const rec of records) {
          if ( rec.recordType !== "url" ) {
            const response = await base64url_encode(rec.data.buffer);
            console.log(`Data read data success by NFC: type ${rec.recordType}, data ${JSON.stringify(await base64url_encode(response))}`);
            return rec.data.buffer;
          }
      }

      throw new Error(t('errors.noCardResponse'));
    }

    /**
     * Handles the NFC authorization process.
     * @param {Uint8Array} dataWright - The data to be written to the NFC tag.
     * @returns {Promise<any>} - The data read from the NFC tag.
     */
    const authorizationNFCHandler = async (ndefMessage, expectedLength) => {
      console.log("Enter NFC request");
      abortController.value = new AbortController();
      console.log(`abortController init ${JSON.stringify(abortController.value)}`);

      function stopNfcPolling(startIdleTimer) {
        console.log(`Start stopNfcPolling`);
        console.log(`StopNfcPolling - abortController.signal =  ${JSON.stringify(abortController.value.signal)}, startIdleTimer = ${startIdleTimer}`);
      }

    return new Promise((resolve, reject) => {
      console.log("Enter Promise");
      const ndef = new window.NDEFReader();
      console.log(`Promise Init  NDEFReader = ${JSON.stringify(ndef)}`);
      let ignoreRead = false;

      abortController.value.signal.addEventListener("abort", (e) => {
        console.log(`Catch signal abort = ${typeof e === 'object' || typeof e === 'array' ? JSON.stringify(e) : e}`);
      }, {once: true});

      ndef.onreading = async () => {
        console.log("Enter ndef.onreading");
        if ( ignoreRead ) {
            return;
        }

        ignoreRead = true;
        console.log("Card found");

        await executeNfcSequence(ndefMessage, expectedLength)
            .then(x => {
              console.log(`executeNfcSequence Then : ${JSON.stringify(x)}`);
              resolve(x);
            })
            .catch(e => {
              console.log(`executeNfcSequence Error : ${e}`);
              reject(e);
            });
      };

      ndef.onreadingerror = (event) => {
        console.log(`Enter onreadingerror : ${event}`);
        stopNfcPolling(true);
        reject(new Error(`${event}`));
      };

      console.log("Waiting for card...");
      ndef.scan({ signal: abortController.value.signal })
        .catch((err) => {
          stopNfcPolling(false);
          reject(err);
        });
      });
    };

    /**
   * Attempts to initiate an NFC scan.
   * @throws {Error} If NFC scan fails or times out.
   */
  const requestNfcAccess = async () => {
    try {
      const ndef = new NDEFReader();
      console.log('Requesting NFC access...');
      const scanPromise = ndef.scan();
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(t('errors.nfcScanTimeout'))), 5000)
      );
      await Promise.race([scanPromise, timeout]);
      console.log('NFC scan started...');
    } catch (err) {
      console.error('NFC Error:', err);
      throw new Error(t('errors.nfcPermissionsError'), {
        cause: { errorSubtitle: t('pages.authorization.errors.processError'), errorBody: typeof err === 'object' || typeof err === 'array' ? JSON.stringify(err) : err }
      });// Re-throw to be handled by the caller
    }
  };

    /**
     * Handles authorization for browser environments (NFC or FIDO).
     * @param {object} nfcHandler - Object containing NFC-related functions.
     * @param {string} requestData - The data to be signed.
     * @returns {Promise<string>} The signed authorization data.
     * @throws {Error} If the authorization fails.
     */
    const handleBrowserAuthorization = async (requestData, expectedLength, longNfc = false) => {
      console.log(`nfcSupported: is type ${typeof nfcSupported}, data ${typeof nfcSupported === 'object' ? JSON.stringify(nfcSupported) : nfcSupported}`);
      const responseData = ref(null);
      if (nfcSupported && nfcPermissionStatus.value === 'prompt') {
        await requestNfcAccess();
      }
      console.log(typeof requestData === 'object' || typeof requestData  === 'array' ? `handleBrowserAuthorization requestData: ${JSON.stringify(requestData)}, ` : `handleBrowserAuthorization requestData: ${requestData}`);
      if (
        nfcSupported &&
        nfcPermissionStatus.value === 'granted' &&
        store.state.settings.cardReaderPriority === 'nfc'
      ) {
        if (longNfc) {
          requestData = buildNfcTagRequest(requestData);
        }
        try {
          responseData.value = await authorizationNFCHandler(requestData, expectedLength);
          console.log(`Data from NFC: ${responseData.value}`);
        } catch (err) {
          console.log(typeof err === Object || typeof err  === Array ? `ERROR Data from NFC: ${JSON.stringify(err)}, ` : `ERROR Data from NFC: ${err}`);
          throw new Error(t('errors.cardRequest'),{ cause: {errorSubtitle: t('pages.authorization.errors.validError'), errorBody: typeof err === Object || typeof err  === Array ? JSON.stringify(err) : err}});
        }
        return responseData.value;
      } else if ( fidoSupported && store.state.settings.cardReaderPriority === 'fido') {
        const fidoRequest = buildFidoRequest({
          hostname: getHost(),
          data: requestData,
        });
        try {
          responseData.value = await startAuthentication(fidoRequest, false);
        } catch (err) {
          throw new Error(t('errors.cardRequest'), {
            cause: { errorSubtitle: 'Prepare FIDO request', errorBody: responseData.value },
          });
        }
        console.log(typeof responseData.value  === 'object' || typeof responseData.value === 'array' ? `Data from FIDO: ${JSON.stringify(responseData.value )}, ` : `Data from FIDO: ${responseData.value }`);
        if (!responseData.value?.response?.signature) {
          throw new Error(t('errors.cardRequest'), {
            cause: { errorSubtitle: 'Error sign', errorBody: responseData.value },
          });
        }
        return await base64url_decode(responseData.value.response.signature);
      }
      console.log('No supported authorization method found.');
      throw new Error(t('errors.noIoPublicKey'));
    };

    const waitForFlutterInAppWebView = () => {
      const readyPromise = new Promise((resolve) => {
        console.log(`Start waitForFlutterInAppWebView`)
        let isFlutterInAppWebViewReady = window.flutter_inappwebview != null && window.flutter_inappwebview.callHandler != null;
          window.addEventListener("flutterInAppWebViewPlatformReady", function(event) {
            isFlutterInAppWebViewReady = true;
          });
        if (isFlutterInAppWebViewReady) {
          console.log(`Start waitForFlutterInAppWebView isFlutterInAppWebViewReady true`)
          return resolve(true);
        }
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(t('errors.cardRequest'), { cause: { errorSubtitle: t('pages.authorization.errors.walletError'), errorBody: t('button.process')} })), 30000)
      );

      return Promise.race([readyPromise, timeoutPromise]);
    };

    const handleInAppWebStop = () => {
      console.log(`Start handleInAppWebStop`)
      waitForFlutterInAppWebView();
      window.flutter_inappwebview.callHandler('handleStopNfc', null);
      console.log(`Stop handleInAppWebStop`)
    }

    /**
     * Handles authorization for Flutter InAppWeb environments.
     * @param {string} requestName - The data to be signed.
     * @param {string} requestData - The data to be signed.
     * @returns {Promise<string>} The signed authorization data.
     * @throws {Error} If the authorization fails.
     */
    const handleInAppWebAuthorization = async (requestName, requestData, longNfc = false) => {
      console.warn('handleInAppWebAuthorization Enter');
      const objectToSend = {
        id: requestName,
        request: requestData,
      };

      const flutterResponse = ref(null);
      const flutterResponseEncoded = ref(null);
      const flutterResponseDecoded = ref(null);
      let isRetry = false;

      while (!flutterResponse.value) {
        await waitForFlutterInAppWebView();
        console.warn('handleInAppWebAuthorization while ');
        await Promise.race([
            await window.flutter_inappwebview.callHandler('handleWithFlutter', objectToSend),
          ])
            .then(async (response) => {
              console.log(`Inappwebview response typeof - ${typeof response}, response - ${JSON.stringify(response)}`);
              console.log(`Inappwebview response?.response typeof - ${typeof response?.response}, response - ${response?.response}`);
              if (response?.code === 'NfcCancelledException') {
                console.warn('NFC scan was cancelled by the user. Retrying...');
                isRetry = true;
                
              } else {
                flutterResponse.value = response?.response;
              }
            })
            .catch((err) => {
              console.log(`handleFlutterInAppWeb Error: is type ${typeof err}, data ${typeof err === 'object' ? JSON.stringify(err) : err}`);
              if (err.message === 'Application call timed out') {
                // Handle timeout specifically
                console.error('Call to Flutter timed out after 30 seconds.');
                // Optionally, set an error state or inform the user
                throw new Error(t('errors.cardRequest'), { cause: { errorSubtitle: t('pages.authorization.errors.processError'), errorBody: typeof err === 'object' ? JSON.stringify(err) : err } });
              }
              throw new Error(t('errors.cardRequest'), { cause: { errorSubtitle: t('pages.authorization.errors.processError'), errorBody: typeof err === 'object' ? JSON.stringify(err) : err } });
            });
        if (!isRetry && flutterResponse.value) {
          console.warn('handleInAppWebAuthorization Break');
          break;
        }
      }
    
      console.log(`Inappwebview resultPrepareAuthenticate.value typeof - ${typeof flutterResponse.value}, response - ${flutterResponse.value}`);
    
      flutterResponseEncoded.value = await base64url_encode(flutterResponse.value);
      console.log(`Inappwebview flutterResponseEncoded.value typeof - ${typeof flutterResponseEncoded.value}, response - ${flutterResponseEncoded.value}`);
      flutterResponseDecoded.value = await base64url_decode(flutterResponseEncoded.value);
      console.log(`Inappwebview flutterResponseDecoded.value typeof - ${typeof flutterResponseDecoded.value}, response - ${flutterResponseDecoded.value}`);
    
      return flutterResponseDecoded.value;
    };

    const nextChunk = async() => {
      console.log(`progressChunk click`);
      nfcWindow.value = false;
      chunkIndex.value = chunkIndex.value + 1;
      if (chunkData.value.chunkIndex > chunkData.value.chunkLength) {
        console.log(`Enter isActive false`);
        isChunksProcessed.value = true;
        emit('update:isActive', false);
        return;
      }
      console.log(`chunkIndex = ${chunkIndex.value}, chunkData.chunkLength = ${chunkData.value.chunkLength}, chunkData.chunkIndex = ${chunkData.value.chunkIndex}`);
      if (chunkIndex.value <= chunkLength.value) {
        console.log(`LOG_INFO 7: nfcListen - ${nfcListen.value}, nfcWindow - ${nfcWindow.value}, nfcRetry - ${nfcRetry.value}, chunkLength - ${chunkLength.value}`);
        await progressChunk();
      }
      console.log(`nextChunk after progressChunk`);
    }

    const progressChunk = async() => {
      console.log(`2 progressChunk ENTER`);
      nfcRetry.value = false;
      try {
        console.log(`progressChunk`);
        title.value = t('nfcHandler.touchCard');
        nfcWindow.value = true;
        nfcListen.value = true;
        const cardRequest = shallowRef(null);

        console.log(`LOG_INFO 1: nfcListen - ${nfcListen.value}, nfcWindow - ${nfcWindow.value}, nfcRetry - ${nfcRetry.value}, chunkLength - ${chunkLength.value}`);

        console.log(`chunkIndex.value buildCardRequest: ${chunkIndex.value}`);
        console.log(`chunks.value[${chunkIndex.value}}] buildCardRequest: ${JSON.stringify(chunks.value[chunkIndex.value])}`);
        if (isChunk.value ) {
          try {
            cardRequest.value = await chunks.value[chunkIndex.value].buildCardRequest({ pin: pinCode.value });
            console.log(`cardRequest:  type is ${typeof cardRequest.value} data is ${JSON.stringify(cardRequest.value)}`);
          } catch(err) {
            console.log(`cardRequest ERROR: ${err}`);
            throw new Error(t('errors.cardRequest'),{ cause: {errorSubtitle: t('pages.authorization.errors.prepareError'), errorBody: typeof err === 'object' || typeof err === 'array' ? JSON.stringify(err) : err } });
          }
          if (!isWebViewApp()) {
            console.log(`Check FIDO or NFC`);
            resultStart.value = await handleBrowserAuthorization( cardRequest.value, chunks.value[chunkIndex.value].getExpectedResponseSize(), nfcLongRequest.value);
            console.log(`FIDO or NFC resultStart.value typeof - ${typeof resultStart.value}, response - ${await base64url_encode(resultStart.value)}`);
          } else if (isWebViewApp()) {
            console.log(`Enter App`);
            resultStart.value =  await handleInAppWebAuthorization('SEND', cardRequest.value, nfcLongRequest.value);
            console.log(`Inappwebview resultStart.value typeof - ${typeof resultStart.value}, response - ${await base64url_encode(resultStart.value)}`);
            if (isMobileAppleDevice) {
              console.log(`Start handleInAppWebStop`)
              handleInAppWebStop();
            }
          } else {
            console.log(`2 progressChunk NFC - Browser not supported `);
            throw new Error(t('errors.authorizationError'),{ cause: {errorBody: t('errors.browserError')}});
          }
          title.value = t('nfcHandler.removeAndClickContinue');

          if (resultStart.value === 'TIME_OUT' || resultStart.value?.stack) {
            console.log(`2 progressChunk NFC - Timeout, can't read card. `);
            throw new Error('Card response',{ cause: {errorSubtitle: "Timeout, can't read card."} });
          }

          console.log(`chunkIndex.value processcardResponse.value: ${chunkIndex.value}`);
          cardResponse.value = chunks.value[chunkIndex.value].processCardResponse(resultStart.value);
        } else {
          if (!isWebViewApp()) {
            console.log(`Check FIDO or NFC`);
            resultStart.value = await handleBrowserAuthorization( chunks.value, expectedResponseSize.value.getExpectedResponseSize(), nfcLongRequest.value);
            console.log(`FIDO or NFC resultStart.value typeof - ${typeof resultStart.value}, response - ${await base64url_encode(resultStart.value)}`);
          } else if (isWebViewApp()) {
            console.log(`2 progressChunk Enter App`);
            resultStart.value =  await handleInAppWebAuthorization('SEND', chunks.value, nfcLongRequest.value);
            console.log(`Inappwebview resultStart.value typeof - ${typeof resultStart.value}, response - ${await base64url_encode(resultStart.value)}`);
          } else {
            console.log(`2 progressChunk NFC - Browser not supported `);
            throw new Error('Authorization error',{ cause: {errorBody: 'Browser not supported.'}});
          }
          console.log(`LOG_INFO 2: nfcListen - ${nfcListen.value}, nfcWindow - ${nfcWindow.value}, nfcRetry - ${nfcRetry.value}, chunkLength - ${chunkLength.value}`);
          title.value = t('nfcHandler.removeAndClickContinue');

          if (resultStart.value === 'TIME_OUT' || resultStart.value?.stack) {
            console.log(`2 progressChunk NFC - Timeout, can't read card. `);
            throw new Error('Card response',{ cause: {errorSubtitle: "Timeout, can't read card."} });
          }

          console.log(`chunkIndex.value processcardResponse.value: ${chunkIndex.value}`);
          try {
            cardResponse.value = expectedResponseSize.value.parseResponse(resultStart.value);
          } catch(err) {
            console.log(`2 progressChunk cardResponse ERROR - Timeout, can't read card. ${typeof err === 'object' ? JSON.stringify(err) : err}`);
            throw new Error(t('errors.cardResponse'),{ cause: {errorSubtitle: t('errors.invalidCardResponse'), errorBody: typeof err === 'object' || typeof err === 'array' ? JSON.stringify(err) : err} });
          }
        }

        const { errorCode, keys, pinRemaining } = cardResponse.value;
        console.log(`2 progressChunk cardResponse errorCode: ${typeof errorCode === 'object' ? JSON.stringify(errorCode) : errorCode}`);
        console.log(`2 progressChunk cardResponse keys: ${typeof keys === 'object' ? JSON.stringify(keys) : keys}`);
        console.log(`2 progressChunk cardResponse pinRemaining: ${typeof pinRemaining === 'object' ? JSON.stringify(pinRemaining) : pinRemaining}`);
        console.log(`2 progressChunk cardResponse cardResponse.value: ${typeof cardResponse.value === 'object' ? JSON.stringify(cardResponse.value) : cardResponse.value}`);
        if (errorCode > 0) {
          console.log(`2 progressChunk errorCode enter - ${errorCode}`);
          throw cardResponse.value;
        }
        if (cardResponse.value?.errorCode > 0) {
          console.log(`2 progressChunk cardResponse.value.errorCode enter`);
          throw cardResponse.value?.errorCode;
        }
        if (chunkLength.value === 1) {
          nextChunk();
        }
        nfcListen.value = false;
        retries.value = 0;   // reset counter on success
        console.log(`LOG_INFO 3: nfcListen - ${nfcListen.value}, nfcWindow - ${nfcWindow.value}, nfcRetry - ${nfcRetry.value}, chunkLength - ${chunkLength.value}`);
      } catch (err) {
        console.log(`2 progressChunk ERROR Try read write data ERROR - ${typeof err === 'object' ? JSON.stringify(err) : err}`);
        if (err.errorCode > 0 || err.message === 'No supported authorization method found.' || err?.code === 'PUBLIC_KEY_MISMATCH' || err?.message === 'Public key mismatch' || err?.message === t('errors.cardRequest') || err?.cause?.errorSubtitle === t('pages.authorization.errors.prepareError')) {
          console.log(`2 progressChunk ERROR Try read write data ERROR - non-retryable error`);
          throw err;
        }
        retries.value += 1;

        if (retries.value < maxRetries.value) {
          console.log(`2 progressChunk ERROR: nfcRetry = ${nfcRetry.value}`);
          console.log(`LOG_INFO 4: nfcListen - ${nfcListen.value}, nfcWindow - ${nfcWindow.value}, nfcRetry - ${nfcRetry.value}, chunkLength - ${chunkLength.value}`);
          nfcListen.value = false;
          nfcRetry.value  = true;          // show Retry button
          attemptNumber.value  = t('nfcHandler.retryCount', { n: retries.value, max: maxRetries.value });
          console.log(`LOG_INFO 5: nfcListen - ${nfcListen.value}, nfcWindow - ${nfcWindow.value}, nfcRetry - ${nfcRetry.value}, chunkLength - ${chunkLength.value}`);
          switch (retries.value) {
            case 1:
            title.value = t('nfcHandler.errorReadWriteRetry');
            subTitle.value = t('nfcHandler.attentionStayInstruction');
            case 2:
            title.value = t('nfcHandler.errorReadWriteRetry');
            subTitle.value = t('nfcHandler.exactSpotInstruction');
            default:
          }
          console.log(`Set subTitle.value 1 = ${subTitle.value}`);
          return;                          // wait for user click
        } else {
          // exceeded maximum retries – propagate the error
          console.log(`2 progressChunk ERROR maxRetry: ${err}`);
          retries.value   = 0;
          nfcRetry.value  = false;
          attemptNumber.value  = null;
          title.value = props.title;
          subTitle.value = props.subTitle;
          console.log(`Set subTitle.value 2 = ${subTitle.value}`);
          windowCancel();
          if (isWebViewApp() && isMobileAndroidDevice) {
            console.log(`2 progressChunk ERROR ENTER TO TIMEOUT 10 SEC`);
            let seconds = 10;
            new Promise(resolve => {
              intervalWebApp = setInterval(() => {
                seconds -= 1;

                if (seconds <= 0) {
                  clearInterval(intervalWebApp);
                  countDown.value = null;
                  handleInAppWebStop();
                }
              }, 1000);
            });
          }
          throw err;
        }
      }
    }

    const nfcProgressHandler = (request, expectedSize, longNfc = false) => {
      console.log(`1 nfcProgressHandler ENTER`);
      console.log(`nfcSupported = ${nfcSupported}`);
      console.log(`nfcPermissionStatus.value = ${nfcPermissionStatus.value}`);
      console.log(`isWebViewApp() = ${isWebViewApp()}`);
      console.log(`isMobileAndroidDevice = ${isMobileAndroidDevice}`);
      console.log(`isMobileAppleDevice = ${isMobileAppleDevice}`);

      return new Promise(async (resolve, reject) => {
        if (isWebViewApp() && isMobileAndroidDevice) {
          clearInterval(intervalWebApp);
        }
        clearNfcData();
        console.log(`request?.chunks: length = ${request?.chunks?.length}, data =  ${typeof request?.chunks === 'object' ? JSON.stringify(request?.chunks) : request?.chunks}`);
        expectedResponseSize.value = expectedSize;
        nfcLongRequest.value = longNfc;
        chunks.value = request;
        chunkLength.value = request?.chunks?.length ?? 1;
        console.log(`chunkLength.value = ${chunkLength.value}`);
        emit('update:isActive', true);
        
        const stopWatching = watch(() => props.isActive, (isActive) => {
          console.log(`stopWatching ENTER`);
          if (!isActive) {
            stopWatching(); // Clean up watcher
            if (isChunksProcessed.value) {
              console.log(`stopWatching resolve`);
              resolve(cardResponse.value);
              clearNfcData();
              console.log(`APP AND ANDROID = ${(isWebViewApp() && isMobileAndroidDevice)}`);
              if (isWebViewApp() && isMobileAndroidDevice) {
                console.log(`ENTER TO TIMEOUT 10 SEC`);
                let seconds = 10;
                new Promise(resolve => {
                  intervalWebApp = setInterval(() => {
                    seconds -= 1;

                    if (seconds <= 0) {
                      clearInterval(intervalWebApp);
                      countDown.value = null;
                      handleInAppWebStop();
                    }
                  }, 1000);
                });
              } else if (isWebViewApp() && isMobileAppleDevice) {
                handleInAppWebStop();
              }
    
            } else {
              console.log(`stopWatching reject`);
              clearNfcData();
            }
          }
        });

        try {
          console.log(`LOG_INFO 8: nfcListen - ${nfcListen.value}, nfcWindow - ${nfcWindow.value}, nfcRetry - ${nfcRetry.value}, chunkLength - ${chunkLength.value}`);
          await progressChunk();
        } catch (err) {
          console.log(`1 nfcProgressHandler progressChunk ERROR ${typeof err === 'object' ? JSON.stringify(err) : err}`);
          stopWatching();
          console.log(`APP AND ANDROID = ${(isWebViewApp() && isMobileAndroidDevice)}`);
          if (isWebViewApp() && isMobileAndroidDevice) {
            console.log(`ENTER TO TIMEOUT 10 SEC`);
            let seconds = 10;
            new Promise(resolve => {
              intervalWebApp = setInterval(() => {
                seconds -= 1;

                if (seconds <= 0) {
                  clearInterval(intervalWebApp);
                  countDown.value = null;
                  handleInAppWebStop();
                }
              }, 1000);
            });
          } else if (isWebViewApp() && isMobileAppleDevice) {
            handleInAppWebStop();
          }
          console.log(`1 nfcProgressHandler err instanceof Error = ${err instanceof Error}`);
          if (err instanceof Error) {
            reject(new Error(t('errors.cardResponse'),{ cause: {errorSubtitle: err.message, errorBody:err.cause?.errorBody} }));
          }
          reject(new Error(t('errors.cardResponse'),{ cause: {errorSubtitle: t('pages.authorization.errors.prepareError'), errorBody:typeof cardResponse.value === 'object' ? JSON.stringify(cardResponse.value) : cardResponse.value} }));
          windowCancel();
        }
      });
    }

    const nfcProgressChunksHandler = (request, pinCodeRequest = null, longNfc = false) => {
      return new Promise(async (resolve, reject) => {
        if (isWebViewApp() && isMobileAndroidDevice) {
          clearInterval(intervalWebApp);
        }
        clearNfcData();
        console.log(`request?.chunks: length = ${request?.chunks?.length}, data =  ${typeof request?.chunks === 'object' ? JSON.stringify(request?.chunks) : request?.chunks}`);
        isChunk.value = true;
        nfcLongRequest.value = longNfc;
        pinCode.value = pinCodeRequest;
        // chunks.value = request?.chunks ? request?.chunks : request;
        // chunkLength.value = request?.chunks?.length;
        // Добавленно для Canton
        let flatChunks = [];
        if (Array.isArray(request)) {
          flatChunks = request.flatMap(item => item?.chunks ? item.chunks : item);
        } else if (request?.chunks) {
          flatChunks = request.chunks;
        } else if (request) {
          flatChunks = [request];
        }
        chunks.value = flatChunks;
        chunkLength.value = flatChunks.length;
        // End Добавленно для Canton
        console.log(`nfcProgressChunksHandler initialized: chunkLength = ${chunkLength.value}`);
        emit('update:isActive', true);
        
        const stopWatching = watch(() => props.isActive, (isActive) => {
          console.log(`stopWatching ENTER`);
          if (!isActive) {
            stopWatching(); // Clean up watcher
            if (isChunksProcessed.value) {
              console.log(`stopWatching resolve`);
              resolve(cardResponse.value);
              clearData();
              console.log(`APP AND ANDROID = ${(isWebViewApp() && isMobileAndroidDevice)}`);
              if (isWebViewApp() && isMobileAndroidDevice) {
                console.log(`ENTER TO TIMEOUT 10 SEC`);
                let seconds = 10;
                new Promise(resolve => {
                  intervalWebApp = setInterval(() => {
                    seconds -= 1;

                    if (seconds <= 0) {
                      clearInterval(intervalWebApp);
                      countDown.value = null;
                      handleInAppWebStop();
                    }
                  }, 1000);
                });
              } else if (isWebViewApp() && isMobileAppleDevice) {
                handleInAppWebStop();
              }
            } else {
              console.log(`stopWatching reject`);
              reject(new Error('Card response',{ cause: {errorSubtitle: "Couldn't write/read data from card.", errorBody:typeof cardResponse.value === 'object' ? JSON.stringify(cardResponse.value) : cardResponse.value} }))
              windowCancel();
              console.log(`APP AND ANDROID = ${(isWebViewApp() && isMobileAndroidDevice)}`);
              if (isWebViewApp() && isMobileAndroidDevice) {
                console.log(`ENTER TO TIMEOUT 10 SEC`);
                let seconds = 10;
                new Promise(resolve => {
                  const intervalWebApp = setInterval(() => {
                    seconds -= 1;

                    if (seconds <= 0) {
                      clearInterval(intervalWebApp);
                      countDown.value = null;
                      handleInAppWebStop();
                    }
                  }, 1000);
                });
              } else if (isWebViewApp() && isMobileAppleDevice) {
                handleInAppWebStop();
              }
              if (isMobileAndroidDevice) {
 
              }
            }
          }
        });

        try {
          console.log(`LOG_INFO 9: nfcListen - ${nfcListen.value}, nfcWindow - ${nfcWindow.value}, nfcRetry - ${nfcRetry.value}, chunkLength - ${chunkLength.value}`);
          await progressChunk();
        } catch (err) {
          console.log(`nfcProgressChunksHandler progressChunk ERROR ${typeof err === 'object' || typeof err === 'array' ? JSON.stringify(err) : err}`);
          const isKeyMismatch = err?.code === 'PUBLIC_KEY_MISMATCH' || err?.message === 'Public key mismatch' || err?.cause?.errorSubtitle === t('errors.publicKeyMismatch');
          const errorSubtitle = isKeyMismatch
            ? t('errors.publicKeyMismatch')
            : (err?.cause?.errorSubtitle || t('pages.authorization.errors.walletError'));
          reject(new Error(t('errors.cardResponse'),{ cause: {errorSubtitle, errorBody:typeof cardResponse.value === 'object' ? JSON.stringify(cardResponse.value) : cardResponse.value} }));
          windowCancel();
          console.log(`APP AND ANDROID = ${(isWebViewApp() && isMobileAndroidDevice)}`);
          if (isWebViewApp() && isMobileAndroidDevice) {
            console.log(`ENTER TO TIMEOUT 10 SEC`);
            let seconds = 10;
            new Promise(resolve => {
              const intervalWebApp = setInterval(() => {
                seconds -= 1;

                if (seconds <= 0) {
                  clearInterval(intervalWebApp);
                  countDown.value = null;
                  handleInAppWebStop();
                }
              }, 1000);
            });
          } else if (isWebViewApp() && isMobileAppleDevice) {
            handleInAppWebStop();
          }
        }
      });
    }

    watchEffect(() => {
      if (nfcWindow.value) {
        document.body.classList.add('cardWindow');
      } else {
        document.body.classList.remove('cardWindow');
      }
    });

    onUnmounted(() => {
      console.log(`onUnmounted`);
    });

    return { nfcWindow, nfcAnimationImg, authorizationNFCHandler, nfcProgressChunksHandler, nfcProgressHandler, 
      props, title, subTitle, chunkData, attemptNumber, progress, windowCancel, retryProgressChunk, resultStart, nextChunk, nfcListen, 
      chunks, chunkLength, chunkIndex, pinCode, countDown, nfcRetry };
  }
});
</script>

<style scoped lang="scss">
.nfc-window {
  background-color: $color-black-40;
  color: $color-white;
  height: calc(100% - 164px);
  width: calc(100% - 48px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  border-radius: 24px 24px 0 0;
  padding: 24px 24px 48px 24px;
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 9999;

  .attempt-number {
    margin-bottom: 8px;
  }
  
  .title {
    font-size: 18px;
    font-weight: 600;
    text-align: center;
  }
  .subtitle {
    font-size: 14px;
    font-weight: 400;
    margin-top: 24px;
    max-width: 400px;
    text-align: center;
  }
  .nfc-animation {
    height: 130%;
    margin-top: 3%;
  }
  .chunk-box {
    display: flex;
    flex-direction: row;
    width: 100%;
    justify-content: space-between;
    align-items: center;

    .chunk-data {
      display: flex;
      flex-direction: row;
    }

    .chunk-length {
      margin-left: 6px;
    }
  }

  .progress-bar-box {
    width: 100%;
    height: 8px;
    margin-top: 8px;
    background-color: $color-black-60;

    .progress-bar {
      height: 100%;
      width: v-bind(progress);
      background-color: $color-orange;
    }
  }

  .top-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .bottom-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .middle-box {
    height: 100%;
    width: 100%;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: flex-start;
    justify-content: center;

    .success-sign {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 30px;
      font-weight: bold;
    }
  }

  .button-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    margin-bottom: 12px;
    margin-top: 24px;

    button {
      width: 90%;
    }

    .button-second {
        margin-top: 12px;
    }
  }
} 
</style>
