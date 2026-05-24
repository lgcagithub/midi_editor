import { describe, it, expect } from 'vitest'
import { isBlackKey, clampPitch } from '../note-utils'
import { PITCH_MIN, PITCH_MAX } from '../../constants'

describe('isBlackKey', () => {
  it('C (pitch=60) 是白键', () => {
    expect(isBlackKey(60)).toBe(false)
  })

  it('C# (pitch=61) 是黑键', () => {
    expect(isBlackKey(61)).toBe(true)
  })

  it('D (pitch=62) 是白键', () => {
    expect(isBlackKey(62)).toBe(false)
  })

  it('D# (pitch=63) 是黑键', () => {
    expect(isBlackKey(63)).toBe(true)
  })

  it('E (pitch=64) 是白键', () => {
    expect(isBlackKey(64)).toBe(false)
  })

  it('F (pitch=65) 是白键', () => {
    expect(isBlackKey(65)).toBe(false)
  })

  it('F# (pitch=66) 是黑键', () => {
    expect(isBlackKey(66)).toBe(true)
  })

  it('G (pitch=67) 是白键', () => {
    expect(isBlackKey(67)).toBe(false)
  })

  it('G# (pitch=68) 是黑键', () => {
    expect(isBlackKey(68)).toBe(true)
  })

  it('A (pitch=69) 是白键', () => {
    expect(isBlackKey(69)).toBe(false)
  })

  it('A# (pitch=70) 是黑键', () => {
    expect(isBlackKey(70)).toBe(true)
  })

  it('B (pitch=71) 是白键', () => {
    expect(isBlackKey(71)).toBe(false)
  })

  it('不同八度中的相同偏移量一致', () => {
    // C 在不同八度都是白键
    expect(isBlackKey(12)).toBe(false) // C-1
    expect(isBlackKey(24)).toBe(false) // C0
    expect(isBlackKey(36)).toBe(false) // C1
    expect(isBlackKey(48)).toBe(false) // C2
    expect(isBlackKey(60)).toBe(false) // C3
    expect(isBlackKey(72)).toBe(false) // C4
    expect(isBlackKey(84)).toBe(false) // C5
    expect(isBlackKey(96)).toBe(false) // C6
    expect(isBlackKey(108)).toBe(false) // C7

    // F# 在不同八度都是黑键
    expect(isBlackKey(18)).toBe(true)  // F#-1
    expect(isBlackKey(30)).toBe(true)  // F#0
    expect(isBlackKey(42)).toBe(true)  // F#1
    expect(isBlackKey(54)).toBe(true)  // F#2
    expect(isBlackKey(66)).toBe(true)  // F#3
    expect(isBlackKey(78)).toBe(true)  // F#4
    expect(isBlackKey(90)).toBe(true)  // F#5
    expect(isBlackKey(102)).toBe(true) // F#6
  })
})

describe('clampPitch', () => {
  it('范围内的音高保持不变', () => {
    expect(clampPitch(60)).toBe(60)
    expect(clampPitch(69)).toBe(69)
    expect(clampPitch(21)).toBe(21)
    expect(clampPitch(108)).toBe(108)
  })

  it('低于最小值时限制为 PITCH_MIN', () => {
    expect(clampPitch(0)).toBe(PITCH_MIN)
    expect(clampPitch(-10)).toBe(PITCH_MIN)
    expect(clampPitch(20)).toBe(PITCH_MIN)
  })

  it('高于最大值时限制为 PITCH_MAX', () => {
    expect(clampPitch(127)).toBe(PITCH_MAX)
    expect(clampPitch(109)).toBe(PITCH_MAX)
    expect(clampPitch(200)).toBe(PITCH_MAX)
  })

  it('边界值正确', () => {
    expect(clampPitch(PITCH_MIN)).toBe(PITCH_MIN)
    expect(clampPitch(PITCH_MAX)).toBe(PITCH_MAX)
    // 略低于最小值
    expect(clampPitch(PITCH_MIN - 1)).toBe(PITCH_MIN)
    // 略高于最大值
    expect(clampPitch(PITCH_MAX + 1)).toBe(PITCH_MAX)
  })
})
