import type { Condition, ParamSchema } from './types'
import { isAtom } from './types'

/** Walk schema tree by index path; returns deepest matching node (or undefined). */
export function resolveSchemaAtPath(
  schema: ParamSchema | undefined,
  path: number[],
): ParamSchema | undefined {
  if (!schema) return undefined
  let node: ParamSchema | undefined = schema
  for (const index of path) {
    node = node.children?.[index]
    if (!node) return undefined
  }
  return node
}

/** Prefer exact path; if missing, fall back to nearest ancestor with text. */
export function resolveTooltipSchema(
  schema: ParamSchema | undefined,
  path: number[],
): ParamSchema | undefined {
  if (!schema) return undefined
  const exact = resolveSchemaAtPath(schema, path)
  if (exact && (exact.label || exact.description)) return exact

  let node: ParamSchema | undefined = schema
  let lastWithText: ParamSchema | undefined =
    schema.label || schema.description ? schema : undefined
  for (const index of path) {
    node = node?.children?.[index]
    if (!node) break
    if (node.label || node.description) lastWithText = node
  }
  return exact ?? lastWithText
}

export function pathSuffix(path: number[]): string {
  return path.map((i) => `[${i}]`).join('')
}

/**
 * Expanded-array column header: the param title, then each subdimension’s short label.
 * Nested levels are appended. A slot with no short label falls back to its index.
 */
/** Short labels from the param root down to this slot, joined for the collapsed cell. */
export function shortLabelChain(schema: ParamSchema | undefined, indices: number[]): string {
  const labels: string[] = []
  let node: ParamSchema | undefined = schema
  for (const index of indices) {
    const child = node?.children?.[index]
    const short = child?.label?.trim()
    if (short) labels.push(short)
    node = child
  }
  return labels.join('->')
}

/** Collapsed-cell caption after a multidimensional slot: `[0] SUBD->DD->Retention`. */
export function slotCaption(schema: ParamSchema | undefined, indices: number[]): string {
  if (indices.length === 0) return ''
  const index = indices[indices.length - 1]!
  const chain = shortLabelChain(schema, indices)
  return chain ? `[${index}] ${chain}` : `[${index}]`
}

export function expandedLeafLabel(
  columnName: string,
  schema: ParamSchema | undefined,
  indices: number[],
): string {
  if (indices.length === 0) return columnName
  const parts = [columnName]
  let node: ParamSchema | undefined = schema
  for (const index of indices) {
    const child = node?.children?.[index]
    const short = child?.label?.trim()
    parts.push(short || `[${index}]`)
    node = child
  }
  return parts.join(' · ')
}

export function formatParamTooltip(
  columnName: string,
  path: number[],
  schema: ParamSchema | undefined,
): string | undefined {
  const node = resolveTooltipSchema(schema, path)
  const ref = `${columnName}${pathSuffix(path)}`
  // Root description defaults to the P/M/R title when empty
  const description =
    path.length === 0
      ? (node?.description?.trim() ? node.description : columnName)
      : node?.description?.trim()
        ? node.description
        : undefined

  if (!node?.label && !description) {
    return path.length === 0 ? columnName : ref
  }
  const title = node?.label ? `${ref} — ${node.label}` : ref
  return description ? `${title}\n${description}` : title
}

/** Index paths of schema leaves. Empty when the param is a single atom. */
export function schemaLeafIndices(schema: ParamSchema | undefined): number[][] {
  const children = schema?.children ?? []
  if (children.length === 0) return []
  const paths: number[][] = []
  function walk(node: ParamSchema, path: number[]) {
    const kids = node.children ?? []
    if (kids.length === 0) {
      paths.push(path)
      return
    }
    kids.forEach((child, i) => walk(child, [...path, i]))
  }
  children.forEach((child, i) => walk(child, [i]))
  return paths
}

function skeleton(value: Condition): Condition {
  if (isAtom(value)) return 'x'
  return value.map(skeleton)
}

/** Don’t-care is allowed unless the schema node explicitly sets allowDontCare to false. */
export function allowsDontCare(schema: ParamSchema | undefined): boolean {
  return schema?.allowDontCare !== false
}

export function allowsDontCareAtPath(
  schema: ParamSchema | undefined,
  path: number[],
): boolean {
  if (path.length === 0) return allowsDontCare(schema)
  let node: ParamSchema | undefined = schema
  for (const index of path) {
    const child = node?.children?.[index]
    if (!child) return true
    node = child
  }
  return allowsDontCare(node)
}

function defaultAtomFor(schema: ParamSchema | undefined): Condition {
  return allowsDontCare(schema) ? 'x' : 'y'
}

/** Default cell shape from the schema tree (x where allowed, otherwise y). */
export function dontCareFromSchema(schema: ParamSchema | undefined): Condition {
  const children = schema?.children ?? []
  if (children.length === 0) return defaultAtomFor(schema)
  return children.map((child) => dontCareFromSchema(child))
}

/**
 * New-row cell: schema dimensions, widened by shapes already used in the column.
 * A bare atom in existing data does not collapse a multidimensional param.
 */
export function defaultCellValue(
  schema: ParamSchema | undefined,
  existing: Condition[],
): Condition {
  let shape = dontCareFromSchema(schema)
  for (const value of existing) {
    shape = widenShape(shape, value)
  }
  return clampDisallowedDontCare(shape, schema)
}

function widenShape(shape: Condition, value: Condition): Condition {
  if (isAtom(value)) return shape
  if (isAtom(shape)) return skeleton(value)
  const len = Math.max(shape.length, value.length)
  const out: Condition[] = []
  for (let i = 0; i < len; i++) {
    const next = value[i]
    const prev = shape[i] ?? 'x'
    out.push(next === undefined ? prev : widenShape(prev, next))
  }
  return out
}

function clampDisallowedDontCare(
  value: Condition,
  schema: ParamSchema | undefined,
  path: number[] = [],
): Condition {
  if (isAtom(value)) {
    if (value === 'x' && !allowsDontCareAtPath(schema, path)) return 'y'
    return value
  }
  return value.map((child, i) => clampDisallowedDontCare(child, schema, [...path, i]))
}

export function emptySchemaNode(): ParamSchema {
  return { label: '', description: '', allowDontCare: true, children: [] }
}

export function ensureSchema(schema?: ParamSchema): ParamSchema {
  return {
    label: schema?.label ?? '',
    description: schema?.description ?? '',
    allowDontCare: schema?.allowDontCare !== false,
    children: schema?.children?.map(ensureSchema) ?? [],
  }
}
