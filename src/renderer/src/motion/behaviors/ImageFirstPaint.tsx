import { useRef, useState } from 'react'
import type { ImgHTMLAttributes } from 'react'

/** A mounted image fades only after its first successful load for a given src. */
export function ImageFirstPaint({ src, className = '', onLoad, onAnimationEnd, ...props }: ImgHTMLAttributes<HTMLImageElement>): JSX.Element {
  const seen = useRef(new Set<string>())
  const [animating, setAnimating] = useState(false)
  return <img {...props} src={src} className={`ak-motion-image-first-paint ${animating ? 'is-animating' : ''} ${className}`.trim()}
    onLoad={(event) => {
      if (src && !seen.current.has(src)) {
        seen.current.add(src)
        setAnimating(true)
      }
      onLoad?.(event)
    }}
    onAnimationEnd={(event) => {
      setAnimating(false)
      onAnimationEnd?.(event)
    }} />
}
