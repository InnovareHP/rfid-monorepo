import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

// A test environment defines the window without the method, so both are
// checked. False matches the desktop-first value this hook used to start from.
const isCompact = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(QUERY).matches
    : false

export function useIsMobile() {
  // Read synchronously on first render: returning false until an effect ran
  // painted the desktop layout for one frame on every phone.
  const [isMobile, setIsMobile] = React.useState(isCompact)

  React.useEffect(() => {
    if (typeof window.matchMedia !== "function") return

    const mql = window.matchMedia(QUERY)
    const onChange = () => setIsMobile(mql.matches)
    mql.addEventListener("change", onChange)
    setIsMobile(mql.matches)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
