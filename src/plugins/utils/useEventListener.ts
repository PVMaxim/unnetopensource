import type { Arrayable, Fn  } from './datas'
import { isObject, toArray , defaultWindow } from './datas'
import { watchImmediate } from './watchImmediate'
import { tryOnScopeDispose } from './tryOnScopeDispose'
import { computed, toValue, unref, MaybeRef, MaybeRefOrGetter } from 'vue'
import { unrefElement } from './unrefElement'

interface InferEventTarget<Events> {
  addEventListener: (event: Events, fn?: any, options?: any) => any
  removeEventListener: (event: Events, fn?: any, options?: any) => any
}

export type WindowEventName = keyof WindowEventMap
export type DocumentEventName = keyof DocumentEventMap

export interface GeneralEventListener<E = Event> {
  (evt: E): void
}

export function useEventListener<E extends keyof WindowEventMap>(
  event: MaybeRefOrGetter<Arrayable<E>>,
  listener: MaybeRef<Arrayable<(this: Window, ev: WindowEventMap[E]) => any>>,
  options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>
): Fn

export function useEventListener<E extends keyof WindowEventMap>(
  target: Window,
  event: MaybeRefOrGetter<Arrayable<E>>,
  listener: MaybeRef<Arrayable<(this: Window, ev: WindowEventMap[E]) => any>>,
  options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>
): Fn

export function useEventListener<E extends keyof DocumentEventMap>(
  target: DocumentOrShadowRoot,
  event: MaybeRefOrGetter<Arrayable<E>>,
  listener: MaybeRef<Arrayable<(this: Document, ev: DocumentEventMap[E]) => any>>,
  options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>
): Fn

export function useEventListener<E extends keyof HTMLElementEventMap>(
  target: MaybeRefOrGetter<Arrayable<HTMLElement> | null | undefined>,
  event: MaybeRefOrGetter<Arrayable<E>>,
  listener: MaybeRef<(this: HTMLElement, ev: HTMLElementEventMap[E]) => any>,
  options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>
): () => void

export function useEventListener<Names extends string, EventType = Event>(
  target: MaybeRefOrGetter<Arrayable<InferEventTarget<Names>> | null | undefined>,
  event: MaybeRefOrGetter<Arrayable<Names>>,
  listener: MaybeRef<Arrayable<GeneralEventListener<EventType>>>,
  options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>
): Fn

export function useEventListener<EventType = Event>(
  target: MaybeRefOrGetter<Arrayable<EventTarget> | null | undefined>,
  event: MaybeRefOrGetter<Arrayable<string>>,
  listener: MaybeRef<Arrayable<GeneralEventListener<EventType>>>,
  options?: MaybeRefOrGetter<boolean | AddEventListenerOptions>
): Fn

export function useEventListener(...args: unknown[]) {
  const cleanups: Array<() => void> = []
  const cleanup = () => {
    cleanups.forEach(fn => fn())
    cleanups.length = 0
  }

  const register = (
    el: EventTarget,
    event: string,
    listener: EventListenerOrEventListenerObject,
    options: boolean | AddEventListenerOptions | undefined,
  ) => {
    el.addEventListener(event, listener, options)
    return () => el.removeEventListener(event, listener, options)
  }

  const firstParamTargets = computed(() => {
    const test = toArray(toValue(args[0])).filter((e: unknown) => e != null)
    return test.every((e: unknown) => typeof e !== 'string') ? test : undefined
  })

  const stopWatch = watchImmediate(
    () => {
      const rawList = (firstParamTargets.value?.map((e: unknown) => unrefElement(e as never)) ?? [defaultWindow]) as Array<EventTarget | null | undefined>;
      const targets: EventTarget[] = rawList.filter((e): e is EventTarget => e != null);
      return [
        targets,
        toArray(toValue(firstParamTargets.value ? args[1] : args[0])) as unknown as string[],
        toArray(unref(firstParamTargets.value ? args[2] : args[1])) as EventListenerOrEventListenerObject[],
        toValue(firstParamTargets.value ? args[3] : args[2]) as boolean | AddEventListenerOptions | undefined,
      ] as const;
    },
    ([raw_targets, raw_events, raw_listeners, raw_options]) => {
      cleanup()

      if (!raw_targets?.length || !raw_events?.length || !raw_listeners?.length)
        return

      const optionsClone = isObject(raw_options) ? { ...raw_options } : raw_options
      cleanups.push(
        ...raw_targets.flatMap((el: EventTarget) =>
          raw_events.flatMap((event: string) =>
            raw_listeners.map((listener: EventListenerOrEventListenerObject) => register(el, event, listener, optionsClone)),
          ),
        ),
      )
    },
    { flush: 'post' },
  )

  const stop = () => {
    stopWatch()
    cleanup()
  }

  tryOnScopeDispose(cleanup)

  return stop
}