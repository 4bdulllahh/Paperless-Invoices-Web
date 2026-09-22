import type { ComponentType } from 'react'
import type { TemplateId } from '../domain/schema'
import { ClassicTemplate } from './ClassicTemplate'
import type { TemplateProps } from './layout'
import { MinimalTemplate } from './MinimalTemplate'
import { ModernTemplate } from './ModernTemplate'

/** Adding a template: create its component, then add one line here. */
export const TEMPLATES: Record<TemplateId, ComponentType<TemplateProps>> = {
  modern: ModernTemplate,
  classic: ClassicTemplate,
  minimal: MinimalTemplate,
}
