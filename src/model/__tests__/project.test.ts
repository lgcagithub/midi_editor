import { describe, it, expect } from 'vitest'
import { createDefaultProject } from '../project'
import { DEFAULT_PPQ, DEFAULT_BPM } from '../../constants'

describe('createDefaultProject', () => {
  it('返回的工程包含默认 PPQ 值', () => {
    const project = createDefaultProject()
    expect(project.ppq).toBe(DEFAULT_PPQ)
  })

  it('返回的工程包含 1 个空音轨', () => {
    const project = createDefaultProject()
    expect(project.tracks).toHaveLength(1)
    expect(project.tracks[0]!.id).toBe('track-1')
    expect(project.tracks[0]!.name).toBe('钢琴')
    expect(project.tracks[0]!.notes).toHaveLength(0)
  })

  it('返回的工程 tempoMap 在 tick 0 包含默认 BPM', () => {
    const project = createDefaultProject()
    expect(project.tempoMap).toHaveLength(1)
    expect(project.tempoMap[0]!.tick).toBe(0)
    expect(project.tempoMap[0]!.bpm).toBe(DEFAULT_BPM)
  })

  it('返回的工程有默认拍号 4/4', () => {
    const project = createDefaultProject()
    expect(project.timeSigs).toHaveLength(1)
    expect(project.timeSigs[0]!.tick).toBe(0)
    expect(project.timeSigs[0]!.numerator).toBe(4)
    expect(project.timeSigs[0]!.denominator).toBe(4)
  })

  it('每次调用返回一个新对象（非引用复用）', () => {
    const project1 = createDefaultProject()
    const project2 = createDefaultProject()
    expect(project1).not.toBe(project2)
    expect(project1.tracks).not.toBe(project2.tracks)
    expect(project1.tempoMap).not.toBe(project2.tempoMap)
    expect(project1.timeSigs).not.toBe(project2.timeSigs)
  })
})
