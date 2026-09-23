import { Document } from '@react-pdf/renderer'
import type { TemplateProps } from './layout'
import { TEMPLATES } from './registry'

/** The whole PDF: document metadata plus the invoice's chosen template. */
export function InvoiceDocument(props: TemplateProps) {
  const { view } = props
  const Template = TEMPLATES[view.templateId]
  return (
    <Document
      title={`${view.title} ${view.number}`}
      author={view.from.name || undefined}
      subject={view.to.name ? `Invoice for ${view.to.name}` : 'Invoice'}
      creator="Paperless"
      producer="Paperless"
    >
      <Template {...props} />
    </Document>
  )
}
