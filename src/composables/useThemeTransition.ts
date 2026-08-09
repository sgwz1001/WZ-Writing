import { ref, computed } from 'vue'

const DURATION = 720

export function useThemeTransition(onFlip: () => void) {
  const animating = ref(false)
  const origin = ref({ x: 0, y: 0 })
  const skin = ref<'genshin' | 'star' | 'zenless'>('star')
  const maxRadius = computed(() => Math.hypot(window.innerWidth, window.innerHeight))

  function trigger(e: MouseEvent | PointerEvent | { clientX: number; clientY: number }, nextSkin?: typeof skin.value) {
    origin.value = { x: e.clientX, y: e.clientY }
    if (nextSkin) skin.value = nextSkin
    animating.value = true
    window.setTimeout(() => {
      onFlip()
      animating.value = false
    }, DURATION)
  }

  function beforeEnter(el: Element) {
    const htmlEl = el as HTMLElement
    htmlEl.style.clipPath = `circle(0% at ${origin.value.x}px ${origin.value.y}px)`
  }

  function enter(el: Element, done: () => void) {
    const htmlEl = el as HTMLElement
    requestAnimationFrame(() => {
      htmlEl.style.transition = `clip-path ${DURATION}ms var(--ease-out)`
      htmlEl.style.clipPath = `circle(${maxRadius.value}px at ${origin.value.x}px ${origin.value.y}px)`
      htmlEl.addEventListener('transitionend', done, { once: true })
      // 兜底：若 transitionend 未触发，700ms 后强制结束
      window.setTimeout(done, DURATION + 80)
    })
  }

  function leave(_el: Element, done: () => void) {
    done()
  }

  return {
    animating,
    origin,
    skin,
    duration: DURATION,
    trigger,
    beforeEnter,
    enter,
    leave,
  }
}
