import { useId, useState, type ReactNode } from 'react'

export type AccordionProps = {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
  className?: string
}

/** Keeps the panel mounted; native button handles Enter/Space and the closed panel is inert. */
export function Accordion({ title, children, defaultOpen = false, open, onOpenChange, disabled = false, className }: AccordionProps): JSX.Element {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = open ?? internalOpen
  const id = useId()
  const triggerId = `${id}-trigger`
  const panelId = `${id}-panel`

  function toggle(): void {
    if (disabled) return
    const next = !isOpen
    if (open === undefined) setInternalOpen(next)
    onOpenChange?.(next)
  }

  return <div className={`ak-ui-accordion${className ? ` ${className}` : ''}`} data-open={isOpen}>
    <div className="ak-ui-accordion__heading">
      <button className="ak-ui-accordion__trigger" type="button" id={triggerId} aria-expanded={isOpen} aria-controls={panelId} disabled={disabled} onClick={toggle}>
        <span className="ak-ui-accordion__title">{title}</span>
        <span className="ak-ui-accordion__state" aria-hidden="true">{isOpen ? '閉じる' : '開く'}</span>
        <span className="ak-motion-caret ak-ui-accordion__caret" data-open={isOpen} aria-hidden="true">›</span>
      </button>
    </div>
    <div className="ak-motion-accordion" data-open={isOpen}>
      <div className="ak-motion-accordion-content" id={panelId} role="region" aria-labelledby={triggerId} aria-hidden={!isOpen} ref={(node) => { if (node) node.inert = !isOpen }}>
        <div className="ak-ui-accordion__body">{children}</div>
      </div>
    </div>
  </div>
}
