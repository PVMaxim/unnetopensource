import { StreamApiNotSupportedError, InsecureContextError, StreamLoadTimeoutError } from './errors'
import { eventOn, timeout } from './callforth'
import shimGetUserMedia from './shimGetUserMedia'
import { assertNever } from './util'

type StartTaskResult = {
  type: 'start'
  data: {
    videoEl: HTMLVideoElement
    stream: MediaStream
    capabilities: Partial<MediaTrackCapabilities>
    constraints: MediaTrackConstraints
    isTorchOn: boolean
  }
}

type StopTaskResult = {
  type: 'stop'
  data: {}
}

type FailedTask = {
  type: 'failed'
  error: Error
}

type TaskResult = StartTaskResult | StopTaskResult | FailedTask

let taskQueue: Promise<TaskResult> = Promise.resolve({ type: 'stop', data: {} })

type CreateObjectURLCompat = (obj: MediaSource | Blob | MediaStream) => string

async function runStartTask(
  videoEl: HTMLVideoElement,
  constraints: MediaTrackConstraints,
  torch: boolean
): Promise<StartTaskResult> {

  if (window.isSecureContext !== true) {
    throw new InsecureContextError()
  }

  if (navigator?.mediaDevices?.getUserMedia === undefined) {
    throw new StreamApiNotSupportedError()
  }

  shimGetUserMedia()

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: constraints
  })

  if (videoEl.srcObject !== undefined) {
    videoEl.srcObject = stream
  } else if (videoEl.mozSrcObject !== undefined) {
    videoEl.mozSrcObject = stream
  } else if (window.URL.createObjectURL) {
    videoEl.src = (window.URL.createObjectURL as CreateObjectURLCompat)(stream)
  } else if (window.webkitURL) {
    videoEl.src = (window.webkitURL.createObjectURL as CreateObjectURLCompat)(stream)
  } else {
    videoEl.src = stream.id
  }

  videoEl.play()

  await Promise.race([
    eventOn(videoEl, 'loadeddata'),

    timeout(6_000).then(() => {
      throw new StreamLoadTimeoutError()
    })
  ])

  await timeout(500)

  const [track] = stream.getVideoTracks()

  const capabilities: Partial<MediaTrackCapabilities> = track?.getCapabilities?.() ?? {}

  let isTorchOn = false
  if (torch && (capabilities as any).torch) {
    await track.applyConstraints({ advanced: [{ torch: true } as any] })
    isTorchOn = true
  }

  return {
    type: 'start',
    data: {
      videoEl,
      stream,
      capabilities,
      constraints,
      isTorchOn
    }
  }
}

export async function start(
  videoEl: HTMLVideoElement,
  {
    constraints,
    torch,
    restart = false
  }: {
    constraints: MediaTrackConstraints
    torch: boolean
    restart?: boolean
  }
): Promise<Partial<MediaTrackCapabilities>> {
  taskQueue = taskQueue
    .then((prevTaskResult) => {
      if (prevTaskResult.type === 'start') {
        const {
          data: {
            videoEl: prevVideoEl,
            stream: prevStream,
            constraints: prevConstraints,
            isTorchOn: prevIsTorchOn
          }
        } = prevTaskResult
        if (
          !restart &&
          videoEl === prevVideoEl &&
          constraints === prevConstraints &&
          torch === prevIsTorchOn
        ) {
          return prevTaskResult
        }
        return runStopTask(prevVideoEl, prevStream, prevIsTorchOn).then(() =>
          runStartTask(videoEl, constraints, torch)
        )
      } else if (prevTaskResult.type === 'stop' || prevTaskResult.type === 'failed') {
        return runStartTask(videoEl, constraints, torch)
      }

      assertNever(prevTaskResult)
    })
    .catch((error: Error) => {
      return { type: 'failed', error }
    })

  const taskResult = await taskQueue

  if (taskResult.type === 'stop') {
    throw new Error('Something went wrong with the camera task queue (start task).')
  } else if (taskResult.type === 'failed') {
    throw taskResult.error
  } else if (taskResult.type === 'start') {
    return taskResult.data.capabilities
  }

  assertNever(taskResult)
}

async function runStopTask(
  videoEl: HTMLVideoElement,
  stream: MediaStream,
  isTorchOn: boolean
): Promise<StopTaskResult> {

  videoEl.src = ''
  videoEl.srcObject = null
  videoEl.load()

  await eventOn(videoEl, 'error')

  for (const track of stream.getTracks()) {
    isTorchOn ?? (await track.applyConstraints({ advanced: [{ torch: false } as any] }))
    stream.removeTrack(track)
    track.stop()
  }

  return {
    type: 'stop',
    data: {}
  }
}

export async function stop() {
  taskQueue = taskQueue.then((prevTaskResult) => {
    if (prevTaskResult.type === 'stop' || prevTaskResult.type === 'failed') {
      return prevTaskResult
    }
    const {
      data: { videoEl, stream, isTorchOn }
    } = prevTaskResult
    return runStopTask(videoEl, stream, isTorchOn)
  })
  const taskResult = await taskQueue
  if (taskResult.type === 'start') {
    throw new Error('Something went wrong with the camera task queue (stop task).')
  }
}

export async function getCapabilities(): Promise<Partial<MediaTrackCapabilities>> {
  const result = await taskQueue
  if (result.type === 'start') {
    return result.data.capabilities
  }
  return {}
}

export async function applyZoom(zoom: number) {
  const result = await taskQueue
  if (result.type === 'start') {
    const { stream, capabilities } = result.data
    if ((capabilities as any).zoom) {
      const [track] = stream.getVideoTracks()
      await track.applyConstraints({ advanced: [{ zoom }] } as any)
    }
  }
}
