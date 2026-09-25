import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'standard' | 'compact'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
}

export function Button({ variant = 'secondary', size = 'standard', icon, children, className, type = 'button', ...rest }: ButtonProps): JSX.Element {
  return <button {...rest} type={type} className={`ak-ui-button ak-ui-button--${variant} ak-ui-button--${size}${className ? ` ${className}` : ''}`}>
    {icon && <span className="ak-ui-button__icon" aria-hidden="true">{icon}</span>}
    <span>{children}</span>
  </button>
}

export type IconButtonProps = Omit<ButtonProps, 'icon' | 'children' | 'aria-label'> & {
  'aria-label': string
  children: ReactNode
}

export function IconButton({ variant = 'ghost', size = 'compact', children, className, type = 'button', ...rest }: IconButtonProps): JSX.Element {
  return <button {...rest} type={type} className={`ak-ui-button ak-ui-button--${variant} ak-ui-button--${size} ak-ui-button--icon${className ? ` ${className}` : ''}`}>
    <span aria-hidden="true">{children}</span>
  </button>
}
