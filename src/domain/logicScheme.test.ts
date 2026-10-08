import { describe, expect, it } from 'vitest'
import { createDemoProject } from './factory'
import { generateLogicScheme } from './logicScheme'
import { simplifyMatrix } from './merge'

describe('generateLogicScheme', () => {
  it('produces implication lines with nested addressing', () => {
    const project = simplifyMatrix(createDemoProject())
    const scheme = generateLogicScheme(project)
    expect(scheme).toContain('=>')
    expect(scheme).toMatch(/P\d/)
    expect(scheme).toMatch(/R\d/)
  })
})
