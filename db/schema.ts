import {
  pgTable,
  serial,
  text,
  integer,
  date,
  boolean,
  real,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'

export const animals = pgTable('animals', {
  id: serial().primaryKey(),
  tag: text().notNull().unique(),
  name: text().notNull().default(''),
  breed: text().notNull().default('Holstein'),
  birthDate: date('birth_date', { mode: 'string' }),
  // milking | dry | heifer | sold | culled
  status: text().notNull().default('milking'),
  lactation: integer().notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const breedingEvents = pgTable(
  'breeding_events',
  {
    id: serial().primaryKey(),
    animalId: integer('animal_id')
      .notNull()
      .references(() => animals.id, { onDelete: 'cascade' }),
    date: date({ mode: 'string' }).notNull(),
    // ai | natural | embryo
    method: text().notNull().default('ai'),
    sire: text().notNull().default(''),
    technician: text().notNull().default(''),
    // pending | pregnant | open
    pregnancyResult: text('pregnancy_result').notNull().default('pending'),
    checkDate: date('check_date', { mode: 'string' }),
    notes: text().notNull().default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('breeding_animal_idx').on(t.animalId)],
)

export const calvingEvents = pgTable(
  'calving_events',
  {
    id: serial().primaryKey(),
    animalId: integer('animal_id')
      .notNull()
      .references(() => animals.id, { onDelete: 'cascade' }),
    date: date({ mode: 'string' }).notNull(),
    // 1 (unassisted) – 5 (surgical)
    ease: integer().notNull().default(1),
    // heifer | bull | twins
    calfSex: text('calf_sex').notNull().default('heifer'),
    calfTag: text('calf_tag').notNull().default(''),
    calfWeightKg: real('calf_weight_kg'),
    // alive | stillborn
    outcome: text().notNull().default('alive'),
    notes: text().notNull().default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('calving_animal_idx').on(t.animalId)],
)

export const healthEvents = pgTable(
  'health_events',
  {
    id: serial().primaryKey(),
    animalId: integer('animal_id')
      .notNull()
      .references(() => animals.id, { onDelete: 'cascade' }),
    date: date({ mode: 'string' }).notNull(),
    // mastitis | lameness | metabolic | reproductive | respiratory | digestive | vaccination | other
    category: text().notNull().default('other'),
    condition: text().notNull(),
    treatment: text().notNull().default(''),
    givenBy: text('given_by').notNull().default(''),
    withdrawalUntil: date('withdrawal_until', { mode: 'string' }),
    resolved: boolean().notNull().default(false),
    notes: text().notNull().default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('health_animal_idx').on(t.animalId)],
)
