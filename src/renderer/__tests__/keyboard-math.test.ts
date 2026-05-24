import { describe, it, expect } from 'vitest'
import {
  whiteIndexToPitch,
  pitchToWhiteIndex,
  computeKeyboardGeometry,
  blackKeyVisualSize,
  blackKeyVisualTopOffset,
  keySlotStart,
  whiteKeyStart,
  computeVisiblePitchRange,
  detectKeyClick,
  pitchLabel,
  musicalOctaveOf,
  pitchClassName,
} from '../keyboard-math'
import { PITCH_MIN, PITCH_MAX } from '../../constants'

// ============================================================
// 7.1 — 白键索引 ↔ MIDI 音高
// ============================================================

describe('whiteIndexToPitch', () => {
  it('白键索引 0 = A0 (pitch 21)', () => {
    expect(whiteIndexToPitch(0)).toBe(21)
  })

  it('白键索引 1 = B0 (pitch 23)', () => {
    expect(whiteIndexToPitch(1)).toBe(23)
  })

  it('白键索引 2 = C1 (pitch 24)', () => {
    expect(whiteIndexToPitch(2)).toBe(24)
  })

  it('白键索引 3 = D1 (pitch 26)', () => {
    expect(whiteIndexToPitch(3)).toBe(26)
  })

  it('白键索引 4 = E1 (pitch 28)', () => {
    expect(whiteIndexToPitch(4)).toBe(28)
  })

  it('白键索引 5 = F1 (pitch 29)', () => {
    expect(whiteIndexToPitch(5)).toBe(29)
  })

  it('白键索引 6 = G1 (pitch 31)', () => {
    expect(whiteIndexToPitch(6)).toBe(31)
  })

  it('白键索引 7 = A1 (pitch 33)', () => {
    expect(whiteIndexToPitch(7)).toBe(33)
  })

  it('白键索引 8 = B1 (pitch 35)', () => {
    expect(whiteIndexToPitch(8)).toBe(35)
  })

  it('白键索引 9 = C2 (pitch 36)', () => {
    expect(whiteIndexToPitch(9)).toBe(36)
  })

  it('白键索引 51 = C8 (pitch 108)', () => {
    expect(whiteIndexToPitch(51)).toBe(108)
  })

  it('八度 1-7 每个八度 7 个白键（C→B）', () => {
    // 八度 1 的 C1...B1
    expect(whiteIndexToPitch(2)).toBe(24)   // C1
    expect(whiteIndexToPitch(3)).toBe(26)   // D1
    expect(whiteIndexToPitch(4)).toBe(28)   // E1
    expect(whiteIndexToPitch(5)).toBe(29)   // F1
    expect(whiteIndexToPitch(6)).toBe(31)   // G1
    expect(whiteIndexToPitch(7)).toBe(33)   // A1
    expect(whiteIndexToPitch(8)).toBe(35)   // B1

    // 八度 2 的 C2...B2
    expect(whiteIndexToPitch(9)).toBe(36)   // C2
    expect(whiteIndexToPitch(10)).toBe(38)  // D2
    expect(whiteIndexToPitch(11)).toBe(40)  // E2
    expect(whiteIndexToPitch(12)).toBe(41)  // F2
    expect(whiteIndexToPitch(13)).toBe(43)  // G2
    expect(whiteIndexToPitch(14)).toBe(45)  // A2
    expect(whiteIndexToPitch(15)).toBe(47)  // B2

    // 八度 7 的 C7...B7
    expect(whiteIndexToPitch(44)).toBe(96)  // C7
    expect(whiteIndexToPitch(45)).toBe(98)  // D7
    expect(whiteIndexToPitch(46)).toBe(100) // E7
    expect(whiteIndexToPitch(47)).toBe(101) // F7
    expect(whiteIndexToPitch(48)).toBe(103) // G7
    expect(whiteIndexToPitch(49)).toBe(105) // A7
    expect(whiteIndexToPitch(50)).toBe(107) // B7
  })

  it('越界索引返回边界音高', () => {
    expect(whiteIndexToPitch(-1)).toBe(PITCH_MIN)
    expect(whiteIndexToPitch(52)).toBe(PITCH_MAX)
    expect(whiteIndexToPitch(100)).toBe(PITCH_MAX)
  })
})

describe('pitchToWhiteIndex', () => {
  it('A0 (pitch=21) 对应白键索引 0', () => {
    expect(pitchToWhiteIndex(21)).toBe(0)
  })

  it('A#0 (pitch=22) 对应白键索引 0（与 A0 同槽）', () => {
    expect(pitchToWhiteIndex(22)).toBe(0)
  })

  it('B0 (pitch=23) 对应白键索引 1', () => {
    expect(pitchToWhiteIndex(23)).toBe(1)
  })

  it('C1 (pitch=24) 对应白键索引 2', () => {
    expect(pitchToWhiteIndex(24)).toBe(2)
  })

  it('C#1 (pitch=25) 对应白键索引 2（与 C1 同槽）', () => {
    expect(pitchToWhiteIndex(25)).toBe(2)
  })

  it('D1 (pitch=26) 对应白键索引 3', () => {
    expect(pitchToWhiteIndex(26)).toBe(3)
  })

  it('C4 (pitch=60) 对应白键索引', () => {
    const idx = pitchToWhiteIndex(60)
    // 计数: A0,B0 + octaves 1-3 full (7*3) + C=1 = 2+21+1=24, 索引 = 23
    expect(idx).toBe(23)
  })

  it('C8 (pitch=108) 对应白键索引 51', () => {
    expect(pitchToWhiteIndex(108)).toBe(51)
  })

  it('所有白键音高满足 pitchToWhiteIndex ∘ whiteIndexToPitch 恒等', () => {
    for (let idx = 0; idx < 52; idx++) {
      const pitch = whiteIndexToPitch(idx)
      expect(pitchToWhiteIndex(pitch)).toBe(idx)
    }
  })

  it('黑键音高映射到前一个白键索引', () => {
    // C#4 (61) → 与 C4 (60) 相同白键索引
    expect(pitchToWhiteIndex(61)).toBe(pitchToWhiteIndex(60))
    // F#4 (66) → 与 F4 (65) 相同白键索引
    expect(pitchToWhiteIndex(66)).toBe(pitchToWhiteIndex(65))
    // A#4 (70) → 与 A4 (69) 相同白键索引
    expect(pitchToWhiteIndex(70)).toBe(pitchToWhiteIndex(69))
  })

  it('越界音高返回边界白键索引', () => {
    expect(pitchToWhiteIndex(0)).toBe(0)
    expect(pitchToWhiteIndex(127)).toBe(51)
    expect(pitchToWhiteIndex(20)).toBe(0)
    expect(pitchToWhiteIndex(109)).toBe(51)
  })
})

// ============================================================
// 7.2 — 几何计算
// ============================================================

describe('computeKeyboardGeometry', () => {
  const areaX = 0
  const areaY = 0
  const areaWidth = 80
  const areaHeight = 1040

  it('垂直布局计算白键高度 = areaHeight / 52', () => {
    const geo = computeKeyboardGeometry(areaX, areaY, areaWidth, areaHeight, 'vertical')
    expect(geo.whiteKeySize).toBe(areaHeight / 52)
  })

  it('垂直布局计算黑键行高 = whiteKeySize * 7 / 12', () => {
    const geo = computeKeyboardGeometry(areaX, areaY, areaWidth, areaHeight, 'vertical')
    const expectedBlack = (areaHeight / 52) * 7 / 12
    expect(geo.blackKeySize).toBeCloseTo(expectedBlack, 10)
  })

  it('垂直布局 keyOffset = whiteKeySize - blackKeySize', () => {
    const geo = computeKeyboardGeometry(areaX, areaY, areaWidth, areaHeight, 'vertical')
    expect(geo.keyOffset).toBeCloseTo(geo.whiteKeySize - geo.blackKeySize, 10)
  })

  it('水平布局计算白键宽度 = areaWidth / 52', () => {
    const geo = computeKeyboardGeometry(areaX, areaY, areaWidth, areaHeight, 'horizontal')
    expect(geo.whiteKeySize).toBe(areaWidth / 52)
  })

  it('几何参数中 orientation 被正确记录', () => {
    const vertical = computeKeyboardGeometry(areaX, areaY, areaWidth, areaHeight, 'vertical')
    const horizontal = computeKeyboardGeometry(areaX, areaY, areaWidth, areaHeight, 'horizontal')
    expect(vertical.orientation).toBe('vertical')
    expect(horizontal.orientation).toBe('horizontal')
  })
})

describe('blackKeyVisualSize', () => {
  it('视觉高度 = blackKeySize（直接等于 88 键网格间距）', () => {
    const geo = computeKeyboardGeometry(0, 0, 80, 1040, 'vertical')
    expect(blackKeyVisualSize(geo)).toBe(geo.blackKeySize)
  })
})

describe('blackKeyVisualTopOffset', () => {
  it('视觉尺寸等于网格间距时偏移为 0', () => {
    const geo = computeKeyboardGeometry(0, 0, 80, 1040, 'vertical')
    expect(blackKeyVisualTopOffset(geo)).toBe(0)
  })
})

describe('keySlotStart / whiteKeyStart', () => {
  it('垂直布局 keySlotStart: C8 (keyIndex=87) 在顶部', () => {
    const geo = computeKeyboardGeometry(0, 0, 80, 1040, 'vertical')
    const c8Start = keySlotStart(87, geo)
    expect(c8Start).toBe(geo.keyOffset)
  })

  it('垂直布局 keySlotStart: A0 (keyIndex=0) 在底部', () => {
    const geo = computeKeyboardGeometry(0, 0, 80, 1040, 'vertical')
    const a0Start = keySlotStart(0, geo)
    expect(a0Start).toBeCloseTo(geo.keyOffset + geo.blackKeySize * 87, 10)
  })

  it('垂直布局 whiteKeyStart: C8 (whiteIdx=51) 在顶部', () => {
    const geo = computeKeyboardGeometry(0, 0, 80, 1040, 'vertical')
    expect(whiteKeyStart(51, geo)).toBe(geo.y)
  })

  it('垂直布局 whiteKeyStart: A0 (whiteIdx=0) 在底部', () => {
    const geo = computeKeyboardGeometry(0, 0, 80, 1040, 'vertical')
    expect(whiteKeyStart(0, geo)).toBeCloseTo(geo.y + geo.whiteKeySize * 51, 10)
  })
})

// ============================================================
// 7.5 — 视口裁剪
// ============================================================

describe('computeVisiblePitchRange', () => {
  it('滚动 0 时顶部显示 C8', () => {
    const geo = computeKeyboardGeometry(0, 0, 80, 1040, 'vertical')
    const range = computeVisiblePitchRange(0, 1040, geo)
    expect(range.maxWhiteIdx).toBe(51)
    expect(range.maxPitch).toBe(PITCH_MAX)
  })

  it('视口高度 0 时最小和最大索引相等', () => {
    const geo = computeKeyboardGeometry(0, 0, 80, 1040, 'vertical')
    const range = computeVisiblePitchRange(0, 0, geo)
    expect(range.minWhiteIdx).toBe(range.maxWhiteIdx)
  })

  it('大幅滚动后可见范围在低音区', () => {
    const geo = computeKeyboardGeometry(0, 0, 80, 1040, 'vertical')
    const farScroll = geo.whiteKeySize * 40
    const range = computeVisiblePitchRange(farScroll, 1040, geo)
    // 滚动 40 个白键 → 高音已滚出视口，可见低音区 (whiteIdx ≤ 11)
    expect(range.maxWhiteIdx).toBeLessThanOrEqual(11)
  })
})

// ============================================================
// 7.6 — 点击检测
// ============================================================

describe('detectKeyClick', () => {
  const areaX = 0
  const areaY = 0
  const areaWidth = 80
  const areaHeight = 1040
  const geo = computeKeyboardGeometry(areaX, areaY, areaWidth, areaHeight, 'vertical')

  it('在键盘区域外点击返回 null', () => {
    const result = detectKeyClick(-1, 50, geo)
    expect(result).toBeNull()
  })

  it('点击顶部白键区域返回 C8', () => {
    // 垂直布局：顶部是 C8 (whiteIdx=51, pitch=108)
    const y = geo.y + geo.whiteKeySize / 2
    const x = geo.x + geo.width / 2
    const result = detectKeyClick(x, y, geo)
    expect(result).not.toBeNull()
    expect(result!.keyType).toBe('white')
    expect(result!.pitch).toBe(108)  // C8
  })

  it('点击底部白键区域返回 A0', () => {
    // A0 是 bottom: y = geo.y + 51 * whiteKeySize + whiteKeySize / 2
    const y = geo.y + geo.whiteKeySize * 51 + geo.whiteKeySize / 2
    const x = geo.x + geo.width / 2
    const result = detectKeyClick(x, y, geo)
    expect(result).not.toBeNull()
    expect(result!.keyType).toBe('white')
    expect(result!.pitch).toBe(21)  // A0
  })

  it('点击 C4 白键区域返回正确音高', () => {
    // C4: whiteIdx=23, position = geo.y + whiteKeySize * (51-23) + whiteKeySize/2
    const c4WhiteIdx = pitchToWhiteIndex(60)
    const y = geo.y + geo.whiteKeySize * (51 - c4WhiteIdx) + geo.whiteKeySize / 2
    const result = detectKeyClick(geo.x + geo.width / 2, y, geo)
    expect(result).not.toBeNull()
    expect(result!.pitch).toBe(60)
    expect(result!.keyType).toBe('white')
  })

  it('边界外点击返回 null', () => {
    expect(detectKeyClick(-1, 0, geo)).toBeNull()
    expect(detectKeyClick(0, -1, geo)).toBeNull()
    expect(detectKeyClick(geo.width, 0, geo)).toBeNull()
    expect(detectKeyClick(0, geo.height, geo)).toBeNull()
  })
})

// ============================================================
// 辅助工具测试
// ============================================================

describe('musicalOctaveOf', () => {
  it('C4 (pitch=60) 八度号为 4', () => {
    expect(musicalOctaveOf(60)).toBe(4)
  })

  it('A0 (pitch=21) 八度号为 0', () => {
    expect(musicalOctaveOf(21)).toBe(0)
  })

  it('C8 (pitch=108) 八度号为 8', () => {
    expect(musicalOctaveOf(108)).toBe(8)
  })
})

describe('pitchClassName', () => {
  it('C (pitch=60) 名称为 "C"', () => {
    expect(pitchClassName(60)).toBe('C')
  })

  it('C# (pitch=61) 名称为 "C#"', () => {
    expect(pitchClassName(61)).toBe('C#')
  })

  it('A (pitch=69) 名称为 "A"', () => {
    expect(pitchClassName(69)).toBe('A')
  })
})

describe('pitchLabel', () => {
  it('pitch=60 标签为 "C4"', () => {
    expect(pitchLabel(60)).toBe('C4')
  })

  it('pitch=21 标签为 "A0"', () => {
    expect(pitchLabel(21)).toBe('A0')
  })

  it('pitch=108 标签为 "C8"', () => {
    expect(pitchLabel(108)).toBe('C8')
  })
})
