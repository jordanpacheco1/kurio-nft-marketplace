import type { ComponentType } from 'react'
import type { IconProps } from 'react-iconly'

/** Ícone do Iconly no set "curved" (o do Figma), decorativo: quem usa dá o nome acessível ao botão ou link. */
export function Icon({ as: Glyph, size = 20, ...props }: { as: ComponentType<IconProps>; size?: number } & IconProps) {
  return (
    <span aria-hidden="true" className="inline-flex shrink-0">
      <Glyph set="curved" primaryColor="currentColor" size={size} {...props} />
    </span>
  )
}
