/**
 * Module 2 : Architecture, le schéma.
 *
 * Ces vérifications lisent votre dépôt sans exécuter de code : présence d'une
 * migration versionnée, contraintes déclarées, types des colonnes de prix et
 * de date.
 *
 * Contrat attendu, exporté par `src/academie/module-2.ts` :
 *
 *   export const schema: {
 *     migrationsDir: string          // ex. 'migrations', relatif à la racine
 *     tables: {
 *       member: string               // le nom RÉEL de vos tables,
 *       category: string             // quel qu'il soit
 *       listing: string
 *       photo: string
 *     }
 *     priceColumn: string            // ex. 'annonces.prix'
 *     expiryColumn: string           // ex. 'annonces.expire_le'
 *     instantColumns: string[]       // ex. ['annonces.publiee_le', 'membres.cree_le']
 *   }
 *
 * Vous nommez vos tables et vos colonnes comme vous voulez : la suite lit ce
 * que vous déclarez ici. Elle vérifie que ces objets existent vraiment dans vos
 * migrations et qu'ils ont le bon type.
 *
 * Les catégories forment un arbre (décision 0001) : la table des catégories
 * désigne son parent par une clé étrangère vers elle-même.
 *
 * Un prix est un entier, `integer` ou `bigint` (décision 0002). Une date
 * d'expiration est une `date`, sans heure. Un instant, comme le moment d'une
 * publication, est un `timestamptz` : il garde un point précis dans le temps,
 * quel que soit le fuseau horaire du serveur. Le module 10 en dépend.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { schema } from '../../../src/academie/module-2'

function migrationsSql(): string {
  const dir = join(process.cwd(), schema.migrationsDir)
  expect(existsSync(dir), `dossier de migrations introuvable : ${schema.migrationsDir}`).toBe(
    true,
  )

  const files = readdirSync(dir).filter((name) => name.endsWith('.sql'))
  expect(files.length, `aucune migration .sql dans ${schema.migrationsDir}/`).toBeGreaterThan(
    0,
  )

  return files
    .sort()
    .map((name) => readFileSync(join(dir, name), 'utf8'))
    .join('\n')
    .toLowerCase()
}

/** Les mots qui suivent le type d'une colonne dans sa déclaration. */
const AFTER_TYPE =
  /\s+(?:not|null|default|references|check|primary|unique|generated|constraint|collate)\b|\s*$/

const CREATE_TABLE = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:[\w"]+\.)?"?(\w+)"?\s*\(/g

/** Le contenu des parenthèses de chaque `create table … (…)`, par nom de table. */
function tableBodies(sql: string) {
  const bodies: { table: string; body: string }[] = []
  for (const start of sql.matchAll(CREATE_TABLE)) {
    let depth = 1
    let index = (start.index ?? 0) + start[0].length
    const from = index
    for (; index < sql.length && depth > 0; index += 1) {
      if (sql[index] === '(') depth += 1
      if (sql[index] === ')') depth -= 1
    }
    bodies.push({ table: start[1] ?? '', body: sql.slice(from, index - 1) })
  }
  return bodies
}

/** Les définitions séparées par des virgules, hors des parenthèses. */
function definitions(body: string) {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const character of body) {
    if (character === '(') depth += 1
    if (character === ')') depth -= 1
    if (character === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else current += character
  }
  parts.push(current)
  return parts.map((part) => part.replace(/--[^\n]*/g, '').trim())
}

/** Le type déclaré d'une colonne, par exemple « date » ou « timestamp with time zone ». */
function declaredType(sql: string, reference: string) {
  const [table, column] = reference.includes('.')
    ? (reference.toLowerCase().replace(/"/g, '').split('.').slice(-2) as [string, string])
    : [undefined, reference.toLowerCase().replace(/"/g, '')]
  expect(column.length, `référence de colonne invalide : ${reference}`).toBeGreaterThan(0)

  const bodies = tableBodies(sql)
    .filter((entry) => !table || entry.table === table)
    .map((entry) => entry.body)
  const candidates = [
    ...bodies.flatMap(definitions),
    // Une colonne ajoutée plus tard par une migration `alter table … add column`.
    ...[...sql.matchAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?([^;,]+)/g)].map((match) => match[1] ?? ''),
  ]

  for (const definition of candidates) {
    const match = new RegExp(`^"?${column}"?\\s+([\\s\\S]+)$`).exec(definition.trim())
    if (!match?.[1]) continue
    const rest = match[1].trim()
    const end = AFTER_TYPE.exec(rest)
    return rest.slice(0, end?.index ?? rest.length).trim().replace(/\s+/g, ' ')
  }
  return undefined
}

describe('migration initiale', () => {
  it('déclare les quatre tables du domaine', () => {
    const sql = migrationsSql()
    for (const [role, table] of Object.entries(schema.tables)) {
      expect(
        sql,
        `table « ${table} » (${role}) absente des migrations`,
      ).toMatch(new RegExp(`create\\s+table\\s+(if\\s+not\\s+exists\\s+)?[\\w."]*${table.toLowerCase()}\\b`))
    }
  })

  it('déclare des clés primaires et des clés étrangères', () => {
    const sql = migrationsSql()
    expect(sql).toContain('primary key')
    expect(sql).toMatch(/references|foreign key/)
  })

  it('déclare des colonnes obligatoires', () => {
    expect(migrationsSql()).toContain('not null')
  })

  it('range les catégories en arbre : chacune peut désigner son parent', () => {
    const table = schema.tables.category.toLowerCase().replace(/"/g, '').split('.').at(-1) ?? ''
    const body = tableBodies(migrationsSql())
      .filter((entry) => entry.table === table)
      .map((entry) => entry.body)
      .join('\n')
    expect(body, `table « ${table} » introuvable dans les migrations`).not.toBe('')
    expect(
      body,
      `la table « ${table} » doit avoir une colonne parent qui la référence elle-même`,
    ).toMatch(new RegExp(`references\\s+(?:[\\w"]+\\.)?"?${table}"?\\b`))
  })
})

describe('le prix', () => {
  it('range le prix dans une colonne entière', () => {
    const type = declaredType(migrationsSql(), schema.priceColumn)
    expect(type, `colonne « ${schema.priceColumn} » introuvable dans les migrations`).toBeDefined()
    expect(
      /^(integer|int|int4|bigint|int8)$/.test(type ?? ''),
      `le prix doit être un integer ou un bigint, pas ${type} : l’ariary n’a pas de centimes`,
    ).toBe(true)
  })
})

describe('les dates et les instants', () => {
  it('range la date d’expiration dans une colonne de type date', () => {
    const type = declaredType(migrationsSql(), schema.expiryColumn)
    expect(
      type,
      `colonne « ${schema.expiryColumn} » introuvable dans les migrations`,
    ).toBeDefined()
    expect(type, `la date d’expiration doit être de type date, pas ${type}`).toBe('date')
  })

  it('déclare au moins une colonne d’instant', () => {
    expect(
      schema.instantColumns.length,
      'déclarez vos colonnes d’instant dans schema.instantColumns',
    ).toBeGreaterThan(0)
  })

  it('range les instants en timestamptz, jamais sans fuseau', () => {
    const sql = migrationsSql()
    for (const reference of schema.instantColumns) {
      const type = declaredType(sql, reference)
      expect(
        type,
        `colonne « ${reference} » introuvable dans les migrations`,
      ).toBeDefined()
      expect(
        /^(timestamptz|timestamp with time zone)$/.test(type ?? ''),
        `la colonne « ${reference} » doit être un timestamptz, pas ${type}`,
      ).toBe(true)
    }
  })
})
