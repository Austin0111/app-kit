import type { HTMLAttributes } from 'react'

export type EmptyStateProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  title: string
  description: string
}

/** Text-only status for a loaded collection with no items. */
export function EmptyState({ title, description, className, ...rest }: EmptyStateProps): JSX.Element {
  return <div {...rest} role="status" className={`ak-ui-empty-state${className ? ` ${className}` : ''}`}>
    <strong className="ak-ui-empty-state__title">{title}</strong>
    <p className="ak-ui-empty-state__description">{description}</p>
  </div>
}
