import { v4 as uuid } from 'uuid'
import type { Condition, ParamSchema, Project, Row, Section } from './types'

/** Default schema: Description starts as the P/M/R title (editable later). */
export function defaultColumnSchema(name: string): ParamSchema {
  return { label: '', description: name, allowDontCare: true, children: [] }
}

export function createColumn(name: string, schema?: ParamSchema) {
  return {
    id: uuid(),
    name,
    schema: schema ?? defaultColumnSchema(name),
  }
}

/**
 * When renaming a P/M/R title, keep a custom Description.
 * Sync Description only if it is empty or still equal to the previous title.
 */
export function schemaAfterRename(
  schema: ParamSchema | undefined,
  previousName: string,
  nextName: string,
): ParamSchema {
  const current = schema ?? defaultColumnSchema(previousName)
  // Compare trimmed forms so typing a space in the title ("Payroll" → "Payroll ")
  // does not break sync (desc.trim() === "Payroll" vs previousName === "Payroll ").
  const desc = (current.description ?? '').trim()
  const prev = previousName.trim()
  const shouldSyncDesc = desc === '' || desc === prev
  return {
    ...current,
    description: shouldSyncDesc ? nextName : current.description,
  }
}

/** Default P / M / R section tints (match App.css --inputs / --middle / --outputs). */
export const DEFAULT_SECTION_TINTS: Record<Section['role'], string> = {
  inputs: '#1a5f8f',
  middle: '#0e6b6b',
  outputs: '#8a4a22',
}

export function resolveSectionTint(section: Pick<Section, 'role' | 'tint'>): string {
  const custom = section.tint?.trim()
  if (custom) return custom
  return DEFAULT_SECTION_TINTS[section.role]
}

export function createSection(
  role: Section['role'],
  name: string,
  columnNames: string[],
  description?: string,
): Section {
  return {
    id: uuid(),
    role,
    name,
    description,
    columns: columnNames.map((n) => createColumn(n)),
  }
}

export function createRow(
  category: string,
  cells: Record<string, Condition>,
  comment = '',
): Row {
  return {
    id: uuid(),
    category,
    comment,
    cells,
  }
}

function baseSections(): Section[] {
  const inputs = createSection(
    'inputs',
    'Inputs',
    ['P1', 'P2', 'P3'],
    'Input parameters (P) — conditions that define the situation',
  )
  const middle = createSection(
    'middle',
    'Modifiers',
    ['M1'],
    'Modifier params (M) — intermediate conditions between inputs and outputs',
  )
  const outputs = createSection(
    'outputs',
    'Outputs',
    ['R1'],
    'Result / requirement outputs (R)',
  )
  return [inputs, middle, outputs]
}

/** Default blank project: sections/columns, no sample rows. */
export function createEmptyProject(name = 'Untitled xD'): Project {
  return {
    id: uuid(),
    name,
    sections: baseSections(),
    rows: [],
    updatedAt: new Date().toISOString(),
  }
}

/** Sample nested requirements used by the Demo CTA. */
export function createDemoProject(name = 'Demo xD'): Project {
  const sections = baseSections()
  const inputs = sections[0]!
  const middle = sections[1]!
  const outputs = sections[2]!

  inputs.columns = [
    createColumn('P1', {
      label: 'Primary flag',
      description: 'Main yes/no input for this requirement row',
    }),
    createColumn('P2', {
      label: 'Secondary flag',
      description: 'Companion input paired with P1',
    }),
    createColumn('P3', {
      label: 'Nested condition vector',
      description: 'Multi-dimensional input; hover nested slots for slot-specific docs',
      children: [
        { label: 'Branch A', description: 'First top-level dimension of P3' },
        { label: 'Branch B', description: 'Second top-level dimension of P3' },
        {
          label: 'Nested pair',
          description: 'Third slot holds a nested [., .] pair',
          children: [
            { label: 'Pair left', description: 'P3[2][0]' },
            { label: 'Pair right', description: 'P3[2][1] — often used as don’t-care merge tip' },
          ],
        },
      ],
    }),
  ]
  middle.columns = [
    createColumn('M1', {
      label: 'Derived check',
      description: 'Modifier condition between inputs and outputs',
    }),
  ]
  outputs.columns = [
    createColumn('R1', {
      label: 'Required outcome',
      description: 'Expected output when the row’s P (+ M) match',
    }),
  ]

  const [p1, p2, p3] = inputs.columns
  const [c1] = middle.columns
  const [r1] = outputs.columns

  const rows: Row[] = [
    createRow(
      'Category one',
      {
        [p1!.id]: 'y',
        [p2!.id]: 'y',
        [p3!.id]: ['y', 'y', ['y', 'y']],
        [c1!.id]: 'y',
        [r1!.id]: 'y',
      },
      'Sample nested row 1',
    ),
    createRow(
      'Category one',
      {
        [p1!.id]: 'y',
        [p2!.id]: 'y',
        [p3!.id]: ['y', 'y', ['y', 'x']],
        [c1!.id]: 'y',
        [r1!.id]: 'y',
      },
      'Sample nested row 2',
    ),
    createRow(
      'Category one',
      {
        [p1!.id]: 'y',
        [p2!.id]: 'y',
        [p3!.id]: ['y', 'y', ['n', 'y']],
        [c1!.id]: 'y',
        [r1!.id]: 'y',
      },
      'Sample nested row 3',
    ),
  ]

  return {
    id: uuid(),
    name,
    sections,
    rows,
    updatedAt: new Date().toISOString(),
  }
}
