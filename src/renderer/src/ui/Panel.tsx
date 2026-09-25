import type { HTMLAttributes } from 'react'

type BaseProps = Omit<HTMLAttributes<HTMLDivElement>, 'className'> & { className?: string }
export type PanelProps = BaseProps & (
  | { surface: 'standard' | 'media-safe'; motion?: 'none' | 'enter' }
  | { surface: 'opaque-media'; motion?: 'none' }
)

/** Surface must be explicit; opaque media never receives opacity or transform motion. */
export function Panel({ surface, motion = 'none', className, children, ...rest }: PanelProps): JSX.Element {
  const motionClass = motion === 'enter'
    ? surface === 'media-safe' ? ' ak-motion-panel-media-safe' : ' ak-motion-panel-enter-subtle'
    : ''
  return <div {...rest} className={`ak-ui-panel${motionClass}${className ? ` ${className}` : ''}`} data-surface={surface}>{children}</div>
}
