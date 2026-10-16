import { type DetectedBarcode, type BarcodeFormat, BarcodeDetector, setZXingModuleOverrides } from 'barcode-detector/pure'
import zxingWasmUrl from '@/api/pkg/zxing_reader.wasm?url'
import { eventOn } from './callforth'
import { DropImageFetchError } from './errors'

setZXingModuleOverrides({
  locateFile: (path: string, prefix?: string) => {
    if (path.endsWith('.wasm')) {
      return zxingWasmUrl
    }
    return (prefix || '') + path
  }
})

let barcodeDetector: BarcodeDetector

export function setScanningFormats(formats: BarcodeFormat[]) {
  barcodeDetector = new BarcodeDetector({ formats })
}

type ScanHandler = (_: DetectedBarcode[]) => void

export const keepScanning = async (
  videoElement: HTMLVideoElement,
  {
    detectHandler,
    locateHandler,
    minDelay,
    formats
  }: {
    detectHandler: ScanHandler
    locateHandler: ScanHandler
    minDelay: number
    formats: BarcodeFormat[]
  }
) => {
  setScanningFormats(formats)

  let cropCanvas = null as HTMLCanvasElement | null;

  const processFrame =
    (state: { lastScanned: number; contentBefore: string[]; lastScanHadContent: boolean }) =>
      async (timeNow: number) => {
        if (videoElement.readyState === 0) {
        } else {
          const { lastScanned, contentBefore, lastScanHadContent } = state

          if (timeNow - lastScanned < minDelay) {
            window.requestAnimationFrame(processFrame(state))
          } else {
            let detectedCodes = await barcodeDetector.detect(videoElement)

            if (detectedCodes.length === 0 && videoElement.videoWidth > 0) {
              if (!cropCanvas) {
                cropCanvas = document.createElement('canvas');
              }
              const canvas = cropCanvas;
              const vW = videoElement.videoWidth;
              const vH = videoElement.videoHeight;

              const passes: Array<{ scale: number; filter?: string }> = [
                { scale: 1.0 },
                { scale: 1.0, filter: 'contrast(1.35) brightness(1.05)' },
                { scale: 0.7 },
                { scale: 0.45 }
              ];

              for (const pass of passes) {
                const sw = Math.round(vW * pass.scale);
                const sh = Math.round(vH * pass.scale);
                const sx = Math.round((vW - sw) / 2);
                const sy = Math.round((vH - sh) / 2);

                const maxDim = 960;
                let cw = sw;
                let ch = sh;
                if (cw > maxDim || ch > maxDim) {
                  if (cw >= ch) {
                    ch = Math.round((sh * maxDim) / sw);
                    cw = maxDim;
                  } else {
                    cw = Math.round((sw * maxDim) / sh);
                    ch = maxDim;
                  }
                }

                canvas.width = cw;
                canvas.height = ch;
                const ctx = canvas.getContext('2d', { alpha: false });
                if (ctx) {
                  if (pass.filter) {
                    ctx.filter = pass.filter;
                  } else {
                    ctx.filter = 'none';
                  }
                  ctx.drawImage(videoElement, sx, sy, sw, sh, 0, 0, cw, ch);

                  const croppedCodes = await barcodeDetector.detect(canvas);
                  if (croppedCodes.length > 0) {
                    const scaleX = sw / cw;
                    const scaleY = sh / ch;

                    detectedCodes = croppedCodes.map(code => ({
                      ...code,
                      boundingBox: DOMRectReadOnly.fromRect({
                        x: code.boundingBox.x * scaleX + sx,
                        y: code.boundingBox.y * scaleY + sy,
                        width: code.boundingBox.width * scaleX,
                        height: code.boundingBox.height * scaleY
                      }),
                      cornerPoints: code.cornerPoints.map(p => ({
                        x: p.x * scaleX + sx,
                        y: p.y * scaleY + sy
                      })) as [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }]
                    }));
                    break;
                  }
                }
              }
            }

            const anyNewCodesDetected = detectedCodes.some((code) => {
              return !contentBefore.includes(code.rawValue)
            })

            if (anyNewCodesDetected) {
              detectHandler(detectedCodes)
            }

            const currentScanHasContent = detectedCodes.length > 0

            if (currentScanHasContent) {
              locateHandler(detectedCodes)
            }

            if (!currentScanHasContent && lastScanHadContent) {
              locateHandler(detectedCodes)
            }

            const newState = {
              lastScanned: timeNow,
              lastScanHadContent: currentScanHasContent,

              contentBefore: anyNewCodesDetected
                ? detectedCodes.map((code) => code.rawValue)
                : contentBefore
            }

            window.requestAnimationFrame(processFrame(newState))
          }
        }
      }

  processFrame({
    lastScanned: performance.now(),
    contentBefore: [],
    lastScanHadContent: false
  })(performance.now())
}

const imageElementFromUrl = async (url: string) => {
  if (url.startsWith('http') && url.includes(location.host) === false) {
    throw new DropImageFetchError()
  }

  const image = document.createElement('img')
  image.src = url

  await eventOn(image, 'load')

  return image
}

export const processFile = async (
  file: File,
  formats: BarcodeFormat[] = ['qr_code']
): Promise<DetectedBarcode[]> => {
  const barcodeDetector = new BarcodeDetector({ formats })

  return await barcodeDetector.detect(file)
}

export const processUrl = async (
  url: string,
  formats: BarcodeFormat[] = ['qr_code']
): Promise<DetectedBarcode[]> => {
  const barcodeDetector = new BarcodeDetector({ formats })

  const image = await imageElementFromUrl(url)

  return await barcodeDetector.detect(image)
}
