import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

const WIDE_BREAKPOINT = 1280

// True at >=1280px. Used to opt into desktop-only layouts (e.g. the Today
// two-pane rail) without disturbing the phone/tablet single-column order.
export function useIsWide() {
  const [isWide, setIsWide] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${WIDE_BREAKPOINT}px)`)
    const onChange = () => setIsWide(window.innerWidth >= WIDE_BREAKPOINT)
    mql.addEventListener("change", onChange)
    setIsWide(window.innerWidth >= WIDE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isWide
}
