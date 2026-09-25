import type { HTMLAttributes, MouseEventHandler, ReactNode } from 'react'

type Common = { children: ReactNode; className?: string; surface?: 'standard' | 'media-safe' }
export type CardProps = Common & (
  | ({ interactive?: false } & Omit<HTMLAttributes<HTMLDivElement>, 'onClick'>)
  | ({ interactive: true; onClick: MouseEventHandler<HTMLButtonElement>; disabled?: boolean } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'disabled'>)
)

/** Static cards are divs. Interactive cards are native buttons; image cards do not lift. */
export function Card(props: CardProps): JSX.Element {
  const { children, className, surface = 'standard' } = props
  if (props.interactive) {
    const { interactive: _interactive, onClick, disabled, children: _children, className: _className, surface: _surface, ...rest } = props
    return <button {...rest} type="button" className={`ak-ui-card ak-ui-card--interactive${!disabled && surface === 'standard' ? ' ak-motion-card-lift' : ''}${className ? ` ${className}` : ''}`} data-surface={surface} disabled={disabled} onClick={onClick}>{children}</button>
  }
  const { interactive: _interactive, children: _children, className: _className, surface: _surface, ...rest } = props
  return <div {...rest} className={`ak-ui-card${className ? ` ${className}` : ''}`} data-surface={surface}>{children}</div>
}
