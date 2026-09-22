import type { SVGProps } from 'react'

// Origami crane line art. Keep in sync with public/favicon.svg.
const CRANE_PATH =
  'M487 97L712 968M487 97L862 858M712 968L1030 742L1222 895M1190 860L1240 847M785 985L1030 742V1045M1030 742L1285 1115M712 968L1285 1115M712 968L550 988L45 1260L1030 1177L1285 1115M1003 1045L527 1132L80 1250M1030 1177V1313M765 1203L810 1375L1030 1318L1290 1420M1285 1115V1415M1200 990L1378 458L1460 402L1522 390L1725 650L1450 492M1460 402L1725 650M1460 402L1292 1420M1494 517L1380 1368L1312 1328M1462 798L1978 663L1440 945M1978 663L1620 968L1420 1107'

type CraneMarkProps = Omit<SVGProps<SVGSVGElement>, 'strokeWidth'> & {
  /** Line thickness in CSS pixels, constant at any rendered size. */
  strokeWidth?: number
  /** Accessible name. Omit when the mark sits next to visible "Paperless" text. */
  title?: string
}

export function CraneMark({ strokeWidth = 1.75, title, ...props }: CraneMarkProps) {
  return (
    <svg
      viewBox="5 57 2013 1403"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title && <title>{title}</title>}
      <path d={CRANE_PATH} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
