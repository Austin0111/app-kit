import { useId } from 'react'

export type ToggleProps = {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

/** A controlled switch. Text and aria-checked preserve the state in reduced motion. */
export function Toggle({ label, description, checked, onCheckedChange, disabled = false, className }: ToggleProps): JSX.Element {
  const id = useId()
  return <div className={`ak-ui-toggle${className ? ` ${className}` : ''}`} data-disabled={disabled}>
    <div className="ak-ui-toggle__copy">
      <span className="ak-ui-toggle__label" id={`${id}-label`}>{label}</span>
      {description && <span className="ak-ui-toggle__description" id={`${id}-description`}>{description}</span>}
    </div>
    <button className="ak-ui-toggle__switch" type="button" role="switch" aria-checked={checked} aria-labelledby={`${id}-label`} aria-describedby={description ? `${id}-description` : undefined} disabled={disabled} data-on={checked} onClick={() => onCheckedChange(!checked)}>
      <span className="ak-ui-toggle__track"><span className="ak-motion-toggle-thumb ak-ui-toggle__thumb" data-on={checked} /></span>
      <span className="ak-ui-toggle__state" aria-hidden="true">{checked ? 'オン' : 'オフ'}</span>
    </button>
  </div>
}
