import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { asc, eq, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import {
  animals,
  breedingEvents,
  calvingEvents,
  healthEvents,
} from '../../db/schema.js'
import {
  ANIMAL_STATUSES,
  BREEDING_METHODS,
  CALF_OUTCOMES,
  CALF_SEXES,
  HEALTH_CATEGORIES,
  PREG_RESULTS,
  type HerdData,
} from './herd'
import { buildSampleHerd } from './sample-herd'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date')
const optionalDate = z
  .union([isoDate, z.literal(''), z.null()])
  .optional()
  .transform((v) => (v ? v : null))
const shortText = (max = 120) => z.string().trim().max(max).default('')

export const getHerdData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<HerdData> => {
    const [a, b, c, h] = await Promise.all([
      db.select().from(animals).orderBy(asc(animals.tag)),
      db.select().from(breedingEvents),
      db.select().from(calvingEvents),
      db.select().from(healthEvents),
    ])
    return { animals: a, breeding: b, calving: c, health: h }
  },
)

const animalInput = z.object({
  tag: z.string().trim().min(1, 'Tag is required').max(30),
  name: shortText(60),
  breed: shortText(60),
  birthDate: optionalDate,
  status: z.enum(ANIMAL_STATUSES),
  lactation: z.coerce.number().int().min(0).max(20).default(0),
})

export const saveAnimal = createServerFn({ method: 'POST' })
  .validator(animalInput.extend({ id: z.number().int().optional() }))
  .handler(async ({ data }) => {
    const { id, ...values } = data
    const existing = await db
      .select({ id: animals.id })
      .from(animals)
      .where(sql`lower(${animals.tag}) = lower(${values.tag})`)
    if (existing.some((e) => e.id !== id))
      throw new Error(`An animal with tag ${values.tag} already exists`)
    if (id) {
      const [row] = await db.update(animals).set(values).where(eq(animals.id, id)).returning()
      return row
    }
    const [row] = await db
      .insert(animals)
      .values({ ...values, breed: values.breed || 'Holstein' })
      .returning()
    return row
  })

const animalId = z.coerce.number().int().positive('Choose an animal')

export const addBreeding = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      animalId,
      date: isoDate,
      method: z.enum(BREEDING_METHODS),
      sire: shortText(),
      technician: shortText(),
      pregnancyResult: z.enum(PREG_RESULTS).default('pending'),
      checkDate: optionalDate,
      notes: shortText(500),
    }),
  )
  .handler(async ({ data }) => {
    const [row] = await db.insert(breedingEvents).values(data).returning()
    return row
  })

export const setPregnancyResult = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.number().int().positive(),
      pregnancyResult: z.enum(PREG_RESULTS),
      checkDate: optionalDate,
    }),
  )
  .handler(async ({ data }) => {
    const [row] = await db
      .update(breedingEvents)
      .set({ pregnancyResult: data.pregnancyResult, checkDate: data.checkDate })
      .where(eq(breedingEvents.id, data.id))
      .returning()
    return row
  })

export const addCalving = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      animalId,
      date: isoDate,
      ease: z.coerce.number().int().min(1).max(5),
      calfSex: z.enum(CALF_SEXES),
      calfTag: shortText(30),
      calfWeightKg: z
        .union([z.coerce.number().min(0).max(120), z.literal(''), z.null()])
        .optional()
        .transform((v) => (typeof v === 'number' ? v : null)),
      outcome: z.enum(CALF_OUTCOMES),
      notes: shortText(500),
      registerCalf: z.boolean().default(false),
    }),
  )
  .handler(async ({ data }) => {
    const { registerCalf, ...values } = data
    const [row] = await db.insert(calvingEvents).values(values).returning()
    // A calving starts a new lactation.
    await db
      .update(animals)
      .set({ status: 'milking', lactation: sql`${animals.lactation} + 1` })
      .where(eq(animals.id, values.animalId))
    if (
      registerCalf &&
      values.calfTag &&
      values.outcome === 'alive' &&
      values.calfSex !== 'bull'
    ) {
      await db
        .insert(animals)
        .values({ tag: values.calfTag, status: 'heifer', birthDate: values.date, lactation: 0 })
        .onConflictDoNothing()
    }
    return row
  })

export const addHealth = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      animalId,
      date: isoDate,
      category: z.enum(HEALTH_CATEGORIES),
      condition: z.string().trim().min(1, 'Describe the condition').max(120),
      treatment: shortText(200),
      givenBy: shortText(),
      withdrawalUntil: optionalDate,
      resolved: z.boolean().default(false),
      notes: shortText(500),
    }),
  )
  .handler(async ({ data }) => {
    const [row] = await db.insert(healthEvents).values(data).returning()
    return row
  })

export const setHealthResolved = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.number().int().positive(), resolved: z.boolean() }))
  .handler(async ({ data }) => {
    await db
      .update(healthEvents)
      .set({ resolved: data.resolved })
      .where(eq(healthEvents.id, data.id))
    return { ok: true }
  })

export const deleteRecord = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      kind: z.enum(['breeding', 'calving', 'health', 'animal']),
      id: z.number().int().positive(),
    }),
  )
  .handler(async ({ data }) => {
    const table = {
      breeding: breedingEvents,
      calving: calvingEvents,
      health: healthEvents,
      animal: animals,
    }[data.kind]
    await db.delete(table).where(eq(table.id, data.id))
    return { ok: true }
  })

export const loadSampleHerd = createServerFn({ method: 'POST' })
  .validator(z.object({ today: isoDate }))
  .handler(async ({ data }) => {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(animals)
    if (count > 0) throw new Error('The herd already has animals recorded')
    const sample = buildSampleHerd(data.today)
    const inserted = await db.insert(animals).values(sample.animals).returning()
    const idByTag = new Map(inserted.map((a) => [a.tag, a.id]))
    const withId = <T extends { tag: string }>(rows: T[]) =>
      rows.map(({ tag, ...rest }) => ({ ...rest, animalId: idByTag.get(tag)! }))
    if (sample.breeding.length) await db.insert(breedingEvents).values(withId(sample.breeding))
    if (sample.calving.length) await db.insert(calvingEvents).values(withId(sample.calving))
    if (sample.health.length) await db.insert(healthEvents).values(withId(sample.health))
    return { ok: true }
  })
