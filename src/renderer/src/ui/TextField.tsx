import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes } from 'react'

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  label: string
  description?: string
  error?: string
}

/** Native single-line text input with a persistent accessible label. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, description, error, id, className, 'aria-describedby': externalDescription, 'aria-invalid': externalInvalid, ...inputProps },
  ref
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionId = description ? `${generatedId}-description` : undefined
  const errorId = error ? `${generatedId}-error` : undefined
  const describedBy = [externalDescription, descriptionId, errorId].filter(Boolean).join(' ') || undefined

  return <div className={`ak-ui-text-field${className ? ` ${className}` : ''}`}>
    <label className="ak-ui-text-field__label" htmlFor={inputId}>
      {label}{inputProps.required && <span className="ak-ui-text-field__required">（必須）</span>}
    </label>
    {description && <p className="ak-ui-text-field__description" id={descriptionId}>{description}</p>}
    <input {...inputProps} ref={ref} id={inputId} type="text" className="ak-ui-text-field__input"
      aria-describedby={describedBy} aria-invalid={error ? true : externalInvalid} />
    {error && <p className="ak-ui-text-field__error" id={errorId}>{error}</p>}
  </div>
})
