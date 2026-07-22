import { useEffect } from 'react'

export function useScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return

    const scrollY = window.scrollY
    const body = document.body
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth

    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    // compensa la scrollbar sparita, così il layout non "salta" di lato
    if (scrollBarWidth > 0) body.style.paddingRight = `${scrollBarWidth}px`

    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.width = prev.width
      body.style.overflow = prev.overflow
      body.style.paddingRight = prev.paddingRight
      window.scrollTo(0, scrollY)
    }
  }, [isLocked])
}