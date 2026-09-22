import type { z } from 'zod'
import { moneySchema, percentSchema, quantitySchema } from '../../domain/schema'

/** Field validators: an error message, or undefined when the (normalised) value can be saved. */

const fromSchema = (schema: z.ZodType<string>) => (value: string) =>
  schema.safeParse(value).error?.issues[0].message

export const validateQuantity = fromSchema(quantitySchema)
export const validateMoney = fromSchema(moneySchema)

export function validatePercent(value: string) {
  return (
    fromSchema(percentSchema)(value) ?? (Number(value) > 100 ? 'Can’t be over 100%.' : undefined)
  )
}

export function validateDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
    ? undefined
    : 'Choose a date.'
}
