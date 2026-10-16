<template>
  <div v-show="isLoading" class="qrreader-container">
    <qrcode-stream
      :torch="torchActive"
      :constraints="selectedConstraints"
      :track="trackFunctionSelected.value"
       :formats="selectedBarcodeFormats"
       :zoom="zoom"
       @error="onError"
       @detect="onDetect"
       @camera-on="onCameraReady"
       @camera-off="onCameraOff"
     />
    <div class="background">
      <div v-if="title" class="title">{{ title }}</div>
      <qrFrameIcon />
    </div>
    <CloseIcon class="close" @click=buttonQrClose />
    <div class="extra-controls">
      <button v-if="!torchNotSupported" class="torch-toggle"
        @click="torchActive = !torchActive"
        :class="{ active: torchActive }">
        <torchIcon />
      </button>
      <button v-if="zoomSupported" class="zoom-toggle" @click="cycleZoom">
        {{ zoom }}x
      </button>
      <button v-if="constraintOptions.length >= 2" class="camera-toggle" @click="cycleCamera">
        <svg viewBox="0 0 24 24" fill="white" width="24" height="24">
          <path d="M17,7H15V6A1,1,0,0,0,14,5H10A1,1,0,0,0,9,6V7H7A3,3,0,0,0,4,10V18a3,3,0,0,0,3,3H17a3,3,0,0,0,3-3V10A3,3,0,0,0,17,7ZM11,7h2V6H11Zm7,11a1,1,0,0,1-1,1H7a1,1,0,0,1-1-1V10a1,1,0,0,1,1-1H17a1,1,0,0,1,1,1ZM12,11a3,3,0,1,0,3,3A3,3,0,0,0,12,11Zm0,4a1,1,0,1,1,1-1A1,1,0,0,1,12,15Z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, computed} from 'vue';
import QrcodeStream from '@/components/qrcodeReader/QrcodeStream.vue';
import qrFrameIcon from '@/components/svg/qrFrameIcon.vue';
import torchIcon from '@/components/svg/torchIcon.vue';
import CloseIcon from '@/components/svg/closeIcon.vue';

export default defineComponent({
  name: 'QrReader',
  emits: ['qrDetected', 'onClose', 'isActive', 'onError'],
  props: {
    title: {
      type: [String, null],
      default: null
    },
    subtitle: {
      type: [String, null],
      default: null
    },
  },
  components: {
    QrcodeStream,
    qrFrameIcon,
    torchIcon,
    CloseIcon
  },
  setup(props, { emit }) {
    const isLoading = ref(false);
    const result = ref('');
    const error = ref('');
    const torchActive = ref(false);
    const torchNotSupported = ref(false);
    const BASE_CONSTRAINTS = {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      advanced: [{ focusMode: 'continuous' }]
    };

    const selectedConstraints = ref({
      facingMode: 'environment',
      ...BASE_CONSTRAINTS
    });
    const defaultConstraintOptions = [
      { label: 'rear camera', constraints: { facingMode: 'environment', ...BASE_CONSTRAINTS } },
      { label: 'front camera', constraints: { facingMode: 'user', ...BASE_CONSTRAINTS } }
    ];
    const constraintOptions = ref(defaultConstraintOptions);
    const trackFunctionOptions = [
      { text: 'nothing (default)', value: undefined },
      { text: 'outline', value: paintOutline },
      { text: 'centered text', value: paintCenterText },
      { text: 'bounding box', value: paintBoundingBox }
    ];
    const trackFunctionSelected = ref(trackFunctionOptions[1]);

    const barcodeFormats = ref({
      aztec: false,
      code_128: false,
      code_39: false,
      code_93: false,
      codabar: false,
      databar: false,
      databar_expanded: false,
      data_matrix: false,
      dx_film_edge: false,
      ean_13: false,
      ean_8: false,
      itf: false,
      maxi_code: false,
      micro_qr_code: true,
      qr_code: true,
      rm_qr_code: true,
      pdf417: false,
      upc_a: false,
      upc_e: false,
      linear_codes: false,
      matrix_codes: false
    });

    const selectedBarcodeFormats = computed(() => {
      return Object.keys(barcodeFormats.value).filter((format) => barcodeFormats.value[format]);
    });

    const buttonQrClose = async () => {
      emit('onClose', {
        value: true,
        srcEvent: 'qrClose'
      });
    }

    function onDetect([firstDetectedCode]) {
      result.value = firstDetectedCode.rawValue;
      emit('qrDetected', {
        value: result.value,
        srcEvent: 'qrDetected'
      });
    }

    async function onCameraOff() {
      emit('isActive', {
        value: false,
        srcEvent: 'isActive'
      });
      isLoading.value = false;
    }

    const zoom = ref(1);
    const zoomSupported = ref(false);
    const zoomMax = ref(1);
    const currentCameraIndex = ref(0);

    const cycleZoom = () => {
      if (zoom.value >= zoomMax.value || zoom.value >= 3) {
        zoom.value = 1;
      } else {
        zoom.value = Math.min(zoom.value + 1, zoomMax.value);
      }
    };

    const cycleCamera = () => {
      currentCameraIndex.value = (currentCameraIndex.value + 1) % constraintOptions.value.length;
      selectedConstraints.value = constraintOptions.value[currentCameraIndex.value].constraints;
    };

    async function onCameraReady(capabilities) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(({ kind }) => kind === 'videoinput');

      constraintOptions.value = [
        ...defaultConstraintOptions,
        ...videoDevices.map(({ deviceId, label }) => ({
          label: `${label} (ID: ${deviceId})`,
          constraints: { deviceId, ...BASE_CONSTRAINTS }
        }))
      ];

      torchNotSupported.value = !capabilities.torch;
      zoomSupported.value = !!capabilities.zoom;
      zoomMax.value = capabilities.zoom?.max || 1;

      error.value = '';
      emit('isActive', {
        value: true,
        srcEvent: 'isActive'
      });
      isLoading.value = true;
    }

    function paintOutline(detectedCodes, ctx) {
      for (const detectedCode of detectedCodes) {
        const [firstPoint, ...otherPoints] = detectedCode.cornerPoints;

        ctx.strokeStyle = 'red';

        ctx.beginPath();
        ctx.moveTo(firstPoint.x, firstPoint.y);
        for (const { x, y } of otherPoints) {
          ctx.lineTo(x, y);
        }
        ctx.lineTo(firstPoint.x, firstPoint.y);
        ctx.closePath();
        ctx.stroke();
      }
    }

    function paintBoundingBox(detectedCodes, ctx) {
      for (const detectedCode of detectedCodes) {
        const {
          boundingBox: { x, y, width, height }
        } = detectedCode

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#007bff';
        ctx.strokeRect(x, y, width, height);
      }
    }

    function paintCenterText(detectedCodes, ctx) {
      for (const detectedCode of detectedCodes) {
        const { boundingBox, rawValue } = detectedCode;

        const centerX = boundingBox.x + boundingBox.width / 2;
        const centerY = boundingBox.y + boundingBox.height / 2;

        const fontSize = Math.max(12, (50 * boundingBox.width) / ctx.canvas.width);

        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#35495e';
        ctx.strokeText(detectedCode.rawValue, centerX, centerY);

        ctx.fillStyle = '#5cb984';
        ctx.fillText(rawValue, centerX, centerY);
      }
    }

    function onError(err) {
      error.value = `[${err.name}]: `

      if (err.name === 'NotAllowedError') {
        error.value += 'you need to grant camera access permission'
      } else if (err.name === 'NotFoundError') {
        error.value += 'no camera on this device'
      } else if (err.name === 'NotSupportedError') {
        error.value += 'secure context required (HTTPS, localhost)'
      } else if (err.name === 'NotReadableError') {
        error.value += 'is the camera already in use?'
      } else if (err.name === 'OverconstrainedError') {
        error.value += 'installed cameras are not suitable'
      } else if (err.name === 'StreamApiNotSupportedError') {
        error.value += 'Stream API is not supported in this browser'
      } else if (err.name === 'InsecureContextError') {
        error.value +=
          'Camera access is only permitted in secure context. Use HTTPS or localhost rather than HTTP.'
      } else {
        error.value += err.message
      }
      emit('onError', {
        value: error.value,
        srcEvent: 'qrError'
      });
    }

    return {isLoading, selectedConstraints, trackFunctionSelected, selectedBarcodeFormats, torchActive, torchNotSupported, zoom, zoomSupported, cycleZoom, cycleCamera, constraintOptions, onError, onDetect, onCameraReady, onCameraOff, buttonQrClose }
  }
});
</script>

<style scoped lang="scss">
  .qrreader-container {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;

      .background {
        position: fixed;
        width: 100vw;
        height: 100%;
        left: 0;
        top: 0;

        svg {
          position: absolute;
          width: 70vw;
          height: 70vw;
          left: 50%;
          top: calc(50% - 24px);
          transform: translate(-50%, -50%);
          animation: pulse 2s infinite ease-in-out;
        }

        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) scale(1.02); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
        }

        &::before {
          content: "";
          position: absolute;
          left: 50%;
          top: calc(50% - 24px);
          border-radius: 19px;
          width: 70vw;
          height: 70vw;
          box-shadow: 0px 0px 0px 100vh rgba(0, 0, 0, 0.6);
          @include transforma(translateX(-50%) translateY(-50%));
      }
    }

    .close {
      width: 24px;
      height: 24px;
      position: absolute;
      top: 2vh;
      left: 5%;
    }

    .title {
      position: absolute;
      text-align: center;
      left: 50%;
      top: calc(50% - 45vw - 48px);
      font-size: 24px;
      @include transforma(translateX(-50%) translateY(-100%));
    }

    .extra-controls {
      position: absolute;
      bottom: 40px;
      right: 24px;
      display: flex;
      flex-direction: row;
      gap: 16px;

      button {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background-color: rgba(217, 217, 217, 0.16);
        border: none;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 16px;
        backdrop-filter: blur(5px);
        transition: all 0.2s ease;

        svg {
          width: 24px;
          height: 24px;
          fill: white;
        }

        &.active {
          background-color: rgba(255, 255, 255, 0.4);
        }

        &:active {
          scale: 0.9;
        }
      }
    }
  }
</style>
