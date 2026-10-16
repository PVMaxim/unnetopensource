<template>
  <div :style="wrapperStyle">

    <video
      ref="videoRef"
      :style="videoElStyle"
      autoplay
      muted
      playsinline
    ></video>

    <canvas
      id="qrcode-stream-pause-frame"
      ref="pauseFrameRef"
      v-show="!shouldScan"
      :style="cameraStyle"
    ></canvas>

    <canvas
      id="qrcode-stream-tracking-layer"
      ref="trackingLayerRef"
      :style="overlayStyle"
    ></canvas>

    <div :style="overlayStyle">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DetectedBarcode, BarcodeFormat } from 'barcode-detector'

type Point2D = { x: number; y: number }
import {
  onUnmounted,
  computed,
  onMounted,
  ref,
  watch,
  type CSSProperties
} from 'vue'

import { keepScanning, setScanningFormats } from '../../plugins/qrcode-reader/misc/scanner'
import * as cameraController from '../../plugins/qrcode-reader/misc/camera'
import { assert } from '../../plugins/qrcode-reader/misc/util'
import type { EmittedError } from '../../plugins/qrcode-reader/misc/errors'

export interface QrcodeStreamProps {
  constraints?: MediaTrackConstraints

  formats?: BarcodeFormat[]

  paused?: boolean

  torch?: boolean

  zoom?: number

  track?: (detectedCodes: DetectedBarcode[], ctx: CanvasRenderingContext2D) => void
}

const props = withDefaults(defineProps<QrcodeStreamProps>(), {
  constraints: () => ({ facingMode: 'environment' } as MediaTrackConstraints),
  formats: () => ['qr_code'],
  paused: false,
  torch: false,
  track: undefined,
  zoom: 1
})

const emit = defineEmits<{
  (e: 'detect', detectedCodes: DetectedBarcode[]): void
  (e: 'camera-on', capabilities: Partial<MediaTrackCapabilities>): void
  (e: 'camera-off'): void
  (e: 'error', error: EmittedError): void
}>()

const constraintsCached = ref(props.constraints)
const formatsCached = ref(props.formats)

watch(
  () => props.constraints,
  (newConstraints, oldConstraints) => {
    if (JSON.stringify(newConstraints) !== JSON.stringify(oldConstraints)) {
      constraintsCached.value = newConstraints
    }
  },
  { deep: true }
)

watch(
  () => props.formats,
  (newFormats, oldFormats) => {
    if (JSON.stringify(newFormats) !== JSON.stringify(oldFormats)) {
      formatsCached.value = newFormats
    }
  },
  { deep: true }
)

const pauseFrameRef = ref<HTMLCanvasElement>()
const trackingLayerRef = ref<HTMLCanvasElement>()
const videoRef = ref<HTMLVideoElement>()

const cameraActive = ref(false)

const isMounted = ref(false)

onMounted(() => {
  isMounted.value = true
})

onUnmounted(() => {
  cameraController.stop()
})

const cameraSettings = computed(() => {
  return {
    torch: props.torch,
    constraints: constraintsCached.value,
    shouldStream: isMounted.value && !props.paused
  }
})

watch(
  cameraSettings,
  async (newSettings) => {
    const videoEl = videoRef.value
    assert(
      videoEl !== undefined,
      'cameraSettings watcher should never be triggered when component is not mounted. Thus video element should always be defined.'
    )

    const canvas = pauseFrameRef.value
    assert(
      canvas !== undefined,
      'cameraSettings watcher should never be triggered when component is not mounted. Thus canvas should always be defined.'
    )

    const ctx = canvas.getContext('2d')
    assert(ctx !== null, 'if cavnas is defined, canvas 2d context should also be non-null')

    if (newSettings.shouldStream) {
      cameraController.stop()
      cameraActive.value = false

      try {
        const capabilities = await cameraController.start(videoEl, newSettings)
        if (!isMounted.value) {
          await cameraController.stop()
        } else {
          cameraActive.value = true
          emit('camera-on', capabilities)
        }
      } catch (error: unknown) {
        emit('error', error as EmittedError)
      }
    } else {
      canvas.width = videoEl.videoWidth
      canvas.height = videoEl.videoHeight

      ctx.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight)

      cameraController.stop()
      cameraActive.value = false
      emit('camera-off')
    }
  },
  { deep: true }
)

watch(formatsCached, (formats) => {
  if (isMounted.value) {
    setScanningFormats(formats)
  }
})
watch(() => props.zoom, (zoom) => {
  if (isMounted.value) {
    cameraController.applyZoom(zoom)
  }
})

const shouldScan = computed(() => cameraSettings.value.shouldStream && cameraActive.value)

watch(shouldScan, (shouldScan) => {
  if (shouldScan) {
    assert(
      pauseFrameRef.value !== undefined,
      'shouldScan watcher should only be triggered when component is mounted. Thus pause frame canvas is defined'
    )
    clearCanvas(pauseFrameRef.value)

    assert(
      trackingLayerRef.value !== undefined,
      'shouldScan watcher should only be triggered when component is mounted. Thus tracking canvas is defined'
    )
    clearCanvas(trackingLayerRef.value)

    const scanInterval = () => {
      if (props.track === undefined) {
        return 500
      } else {
        return 40 
      }
    }

    assert(
      videoRef.value !== undefined,
      'shouldScan watcher should only be triggered when component is mounted. Thus video element is defined'
    )
    keepScanning(videoRef.value, {
      detectHandler: (detectedCodes: DetectedBarcode[]) => emit('detect', detectedCodes),
      formats: formatsCached.value,
      locateHandler: onLocate,
      minDelay: scanInterval()
    })
  }
})

const clearCanvas = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d')
  assert(ctx !== null, 'canvas 2d context should always be non-null')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

const onLocate = (detectedCodes: DetectedBarcode[]) => {
  const canvas = trackingLayerRef.value
  assert(
    canvas !== undefined,
    'onLocate handler should only be called when component is mounted. Thus tracking canvas is always defined.'
  )

  const video = videoRef.value
  assert(
    video !== undefined,
    'onLocate handler should only be called when component is mounted. Thus video element is always defined.'
  )

  if (detectedCodes.length === 0 || props.track === undefined) {
    clearCanvas(canvas)
  } else {
    const displayWidth = video.offsetWidth
    const displayHeight = video.offsetHeight

    const resolutionWidth = video.videoWidth
    const resolutionHeight = video.videoHeight

    const largerRatio = Math.max(displayWidth / resolutionWidth, displayHeight / resolutionHeight)
    const uncutWidth = resolutionWidth * largerRatio
    const uncutHeight = resolutionHeight * largerRatio

    const xScalar = uncutWidth / resolutionWidth
    const yScalar = uncutHeight / resolutionHeight
    const xOffset = (displayWidth - uncutWidth) / 2
    const yOffset = (displayHeight - uncutHeight) / 2

    const scale = ({ x, y }: Point2D) => {
      return {
        x: Math.floor(x * xScalar),
        y: Math.floor(y * yScalar)
      }
    }

    const translate = ({ x, y }: Point2D) => {
      return {
        x: Math.floor(x + xOffset),
        y: Math.floor(y + yOffset)
      }
    }

    const adjustedCodes: DetectedBarcode[] = detectedCodes.map((detectedCode) => {
      const { boundingBox, cornerPoints } = detectedCode

      const { x, y } = translate(
        scale({
          x: boundingBox.x,
          y: boundingBox.y
        })
      )
      const { x: width, y: height } = scale({
        x: boundingBox.width,
        y: boundingBox.height
      })

      return {
        ...detectedCode,
        cornerPoints: cornerPoints.map((point) => translate(scale(point))) as [
          Point2D,
          Point2D,
          Point2D,
          Point2D
        ],
        boundingBox: DOMRectReadOnly.fromRect({ x, y, width, height })
      }
    })

    canvas.width = video.offsetWidth
    canvas.height = video.offsetHeight

    const ctx = canvas.getContext('2d')
    assert(ctx !== null, 'canvas 2d context should always be non-null')

    props.track(adjustedCodes, ctx)
  }
}

const wrapperStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'relative',
  'z-index': '0'
}

const overlayStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'absolute',
  top: '0',
  left: '0'
}

const cameraStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  'object-fit': 'cover'
}

const videoElStyle = computed<CSSProperties>(() => {
  if (shouldScan.value) {
    return cameraStyle
  } else {
    return {
      ...cameraStyle,

      visibility: 'hidden',
      position: 'absolute'
    }
  }
})
</script>
