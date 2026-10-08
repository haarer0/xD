import { describe, expect, it } from 'vitest'
import {
  createColumn,
  createEmptyProject,
  DEFAULT_SECTION_TINTS,
  resolveSectionTint,
  schemaAfterRename,
} from './factory'
import { expandedColumnLeaves } from './flatten'
import {
  allowsDontCareAtPath,
  defaultCellValue,
  expandedLeafLabel,
  slotCaption,
} from './schema'
import { cycleAtom } from './types'

describe('resolveSectionTint', () => {
  it('uses role defaults when tint is omitted', () => {
    expect(resolveSectionTint({ role: 'inputs' })).toBe(DEFAULT_SECTION_TINTS.inputs)
    expect(resolveSectionTint({ role: 'middle' })).toBe(DEFAULT_SECTION_TINTS.middle)
    expect(resolveSectionTint({ role: 'outputs' })).toBe(DEFAULT_SECTION_TINTS.outputs)
  })

  it('prefers a custom tint', () => {
    expect(resolveSectionTint({ role: 'inputs', tint: '#ff00aa' })).toBe('#ff00aa')
  })
})

describe('schemaAfterRename', () => {
  it('syncs description when it still matches the old title', () => {
    const next = schemaAfterRename({ description: 'P1' }, 'P1', 'Pressure')
    expect(next.description).toBe('Pressure')
  })

  it('syncs description when empty', () => {
    const next = schemaAfterRename({ description: '' }, 'P1', 'Pressure')
    expect(next.description).toBe('Pressure')
  })

  it('keeps a custom description when renaming the title', () => {
    const next = schemaAfterRename(
      { description: 'Custom docs for this param' },
      'P1',
      'Pressure',
    )
    expect(next.description).toBe('Custom docs for this param')
  })

  it('keeps syncing when the title gains a space', () => {
    let schema = { description: 'Payroll' }
    schema = schemaAfterRename(schema, 'Payroll', 'Payroll ')
    expect(schema.description).toBe('Payroll ')
    schema = schemaAfterRename(schema, 'Payroll ', 'Payroll /')
    expect(schema.description).toBe('Payroll /')
    schema = schemaAfterRename(schema, 'Payroll /', 'Payroll / Department changed')
    expect(schema.description).toBe('Payroll / Department changed')
  })
})

describe('createColumn / createEmptyProject defaults', () => {
  it('defaults Description to the column title', () => {
    expect(createColumn('M2').schema?.description).toBe('M2')
  })

  it('empty project columns use title as Description', () => {
    const project = createEmptyProject()
    for (const section of project.sections) {
      for (const col of section.columns) {
        expect(col.schema?.description).toBe(col.name)
      }
    }
  })
})

describe('multidimensional defaults', () => {
  it('keeps schema dimensions on a new row even when siblings are a single atom', () => {
    const schema = {
      children: [
        { label: 'a' },
        { label: 'b', children: [{ label: 'b0' }, { label: 'b1' }] },
      ],
    }
    expect(defaultCellValue(schema, ['x', 'y'])).toEqual(['x', ['x', 'x']])
  })

  it('widens a new cell to shapes already used in the column', () => {
    expect(defaultCellValue(undefined, ['x', ['y', 'n']])).toEqual(['x', 'x'])
  })

  it('lists schema leaves when every stored value is still one icon', () => {
    const schema = {
      children: [{}, { children: [{}, {}] }],
    }
    expect(expandedColumnLeaves(['x', 'x'], schema).map((l) => l.suffix)).toEqual([
      '[0]',
      '[1][0]',
      '[1][1]',
    ])
  })

  it('names an expanded column with the param title and appended short labels', () => {
    const schema = {
      label: 'Vector',
      children: [
        { label: 'Branch A' },
        {
          label: 'Nested pair',
          children: [{ label: 'Pair left' }, { label: '' }],
        },
      ],
    }
    expect(expandedLeafLabel('P3', schema, [0])).toBe('P3 · Branch A')
    expect(expandedLeafLabel('P3', schema, [1, 0])).toBe('P3 · Nested pair · Pair left')
    expect(expandedLeafLabel('P3', schema, [1, 1])).toBe('P3 · Nested pair · [1]')
  })

  it('defaults new cells to yes when don’t care is disabled', () => {
    expect(defaultCellValue({ allowDontCare: false }, [])).toBe('y')
    expect(
      defaultCellValue(
        {
          children: [{ label: 'a', allowDontCare: false }, { label: 'b' }],
        },
        [],
      ),
    ).toEqual(['y', 'x'])
  })

  it('cycles past don’t care when the param rejects it', () => {
    expect(cycleAtom('y')).toBe('n')
    expect(cycleAtom('n')).toBe('x')
    expect(cycleAtom('x')).toBe('y')
    expect(cycleAtom('n', false)).toBe('y')
    expect(cycleAtom('x', false)).toBe('y')
    expect(allowsDontCareAtPath({ allowDontCare: false }, [])).toBe(false)
    expect(allowsDontCareAtPath(undefined, [])).toBe(true)
  })

  it('captions a collapsed slot with its index and short-label path', () => {
    const schema = {
      children: [
        {
          label: 'SUBD',
          children: [
            {
              label: 'DD',
              children: [{ label: 'Retention' }],
            },
          ],
        },
      ],
    }
    expect(slotCaption(schema, [0, 0, 0])).toBe('[0] SUBD->DD->Retention')
    expect(slotCaption(schema, [0])).toBe('[0] SUBD')
    expect(slotCaption({ children: [{}] }, [1])).toBe('[1]')
  })
})
