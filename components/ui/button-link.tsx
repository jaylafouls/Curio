import { type ComponentProps, type ReactNode } from 'react'
import { Link } from '@/lib/i18n/navigation'
import {
  buttonClasses,
  type ButtonVariant,
  type ButtonSize,
} from './button'

/**
 * ButtonLink — a navigating CTA that looks exactly like <Button> but renders a
 * locale-aware <Link> (an <a>), not a <button>.
 *
 * Every primary CTA in the product is a navigation ("Start your universe →",
 * "Sign up →", "Create a project →"): they must stay real anchors for
 * navigation, prefetch, and SEO. <Button> renders a <button>, so it cannot be
 * used for these without breaking that. This primitive closes the gap — it
 * shares <Button>'s class recipe via buttonClasses(), so the two are visually
 * byte-identical and stay in sync, and it takes the same variant/size/icon API.
 * Use <Button> for actions (onClick, form submit), <ButtonLink> for navigation.
 */
export interface ButtonLinkProps
  extends ComponentProps<typeof Link> {
  variant?: ButtonVariant
  size?: ButtonSize
  iconLeft?: ReactNode
  iconRight?: ReactNode
}

export function ButtonLink({
  variant = 'primary',
  size = 'default',
  iconLeft,
  iconRight,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {iconLeft ? (
        <span className="shrink-0" aria-hidden>
          {iconLeft}
        </span>
      ) : null}
      {children}
      {iconRight ? (
        <span className="shrink-0" aria-hidden>
          {iconRight}
        </span>
      ) : null}
    </Link>
  )
}
