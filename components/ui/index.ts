/**
 * Barrel for the base UI kit (Phase 1, chantier 2/7). Presentational
 * components only — no data logic. Consumed by later chantiers.
 */
export {
  Button,
  buttonClasses,
  type ButtonProps,
  type ButtonVariant,
  type ButtonSize,
} from './button'
export { ButtonLink, type ButtonLinkProps } from './button-link'
export { Input, type InputProps, type InputVariant } from './input'
export {
  Badge,
  BADGE_TOPICS,
  type BadgeProps,
  type BadgeTopic,
  type BadgeVariant,
} from './badge'
export { Avatar, type AvatarProps, type AvatarSize } from './avatar'
export {
  CollectionCard,
  CuratorCard,
  type CollectionCardProps,
  type CollectionCardVariant,
  type CuratorCardProps,
} from './card'
export { Modal, type ModalProps, type ModalVariant } from './modal'
export { Tabs, type TabsProps, type TabItem, type TabsVariant } from './tabs'
export {
  AccentText,
  type AccentTextProps,
  type AccentTextSize,
  type AccentTextTag,
} from './accent-text'
export {
  ThemeToggle,
  type ThemeMode,
  type ThemeToggleProps,
} from './theme-toggle'
export {
  PageContainer,
  type PageContainerProps,
  type PageContainerSize,
  type PageContainerTag,
} from './page-container'
