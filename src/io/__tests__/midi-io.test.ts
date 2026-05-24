/**
 * MIDI 文件读写单元测试
 *
 * 所有 MIDI 文件数据均在测试中程序化创建，无需外部文件。
 */

import { describe, it, expect } from 'vitest'
import {
  readVLQ,
  writeVLQ,
  parseHeader,
  parseTrackEvents,
  parseSMF,
  MIDIParseError,
  loadMIDIFile,
  parseMIDIFromBuffer,
} from '../midi-parser'
import { serializeSMF } from '../midi-serializer'
import { Project } from '@/types'

// ──────────────────────────────────────────────
// 辅助函数：构建 MIDI 数据
// ──────────────────────────────────────────────

/** 构建 MThd 头部 */
function makeHeader(format: number, trackCount: number, ppq: number): number[] {
  return [
    0x4D, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // chunk length = 6
    (format >> 8) & 0xFF, format & 0xFF,
    (trackCount >> 8) & 0xFF, trackCount & 0xFF,
    (ppq >> 8) & 0xFF, ppq & 0xFF,
  ]
}

/** 构建 MTrk 块 */
function makeTrack(data: number[]): number[] {
  return [
    0x4D, 0x54, 0x72, 0x6B, // "MTrk"
    (data.length >> 24) & 0xFF,
    (data.length >> 16) & 0xFF,
    (data.length >> 8) & 0xFF,
    data.length & 0xFF,
    ...data,
  ]
}

/** 构建 VLQ 字节 */
function vlqBytes(value: number): number[] {
  const result = value === 0 ? [0] : []
  let v = value
  const parts: number[] = []
  while (v > 0) {
    parts.unshift(v & 0x7F)
    v >>>= 7
  }
  for (let i = 0; i < parts.length - 1; i++) {
    parts[i]! |= 0x80
  }
  return result.concat(parts)
}

/** 构建 Tempo meta 事件 */
function tempoMeta(deltaTime: number, bpm: number): number[] {
  const mpqn = Math.round(60_000_000 / bpm)
  return [
    ...vlqBytes(deltaTime),
    0xFF, 0x51, 0x03,
    (mpqn >> 16) & 0xFF,
    (mpqn >> 8) & 0xFF,
    mpqn & 0xFF,
  ]
}

/** 构建 Time Signature meta 事件 */
function timeSigMeta(deltaTime: number, num: number, den: number): number[] {
  const denExp = Math.round(Math.log2(den))
  return [
    ...vlqBytes(deltaTime),
    0xFF, 0x58, 0x04,
    num, denExp, 0x30, 0x08,
  ]
}

/** 构建 End of Track meta 事件 */
function endOfTrack(deltaTime: number): number[] {
  return [...vlqBytes(deltaTime), 0xFF, 0x2F, 0x00]
}

/** 构建 Note On 事件 (channel 0) */
function noteOn(deltaTime: number, pitch: number, velocity: number): number[] {
  return [...vlqBytes(deltaTime), 0x90, pitch, velocity]
}

/** 构建 Note Off 事件 (channel 0) */
function noteOff(deltaTime: number, pitch: number, velocity: number): number[] {
  return [...vlqBytes(deltaTime), 0x80, pitch, velocity]
}

/** 构建 Program Change 事件 (channel 0) */
function programChange(deltaTime: number, program: number): number[] {
  return [...vlqBytes(deltaTime), 0xC0, program]
}

/** 构建一个简单的 format 1 MIDI 文件（1 条音符音轨） */
function makeSimpleMIDI(ppq: number = 480, bpm: number = 120): number[] {
  const tempoData = [
    ...tempoMeta(0, bpm),
    ...endOfTrack(0),
  ]
  const noteData = [
    ...noteOn(0, 60, 100),
    ...noteOff(240, 60, 0),
    ...endOfTrack(0),
  ]
  return [
    ...makeHeader(1, 2, ppq),
    ...makeTrack(tempoData),
    ...makeTrack(noteData),
  ]
}

// ──────────────────────────────────────────────
// 5.1 VLQ 解码器
// ──────────────────────────────────────────────

describe('readVLQ', () => {
  it('读取单字节 VLQ (0x00)', () => {
    const result = readVLQ(new Uint8Array([0x00]), 0)
    expect(result.value).toBe(0)
    expect(result.bytesRead).toBe(1)
  })

  it('读取单字节 VLQ (0x7F)', () => {
    const result = readVLQ(new Uint8Array([0x7F]), 0)
    expect(result.value).toBe(127)
    expect(result.bytesRead).toBe(1)
  })

  it('读取单字节 VLQ (0x40 = 64)', () => {
    const result = readVLQ(new Uint8Array([0x40]), 0)
    expect(result.value).toBe(64)
    expect(result.bytesRead).toBe(1)
  })

  it('读取双字节 VLQ (128 = 0x81 0x00)', () => {
    const result = readVLQ(new Uint8Array([0x81, 0x00]), 0)
    expect(result.value).toBe(128)
    expect(result.bytesRead).toBe(2)
  })

  it('读取双字节 VLQ (16383 = 0xFF 0x7F)', () => {
    const result = readVLQ(new Uint8Array([0xFF, 0x7F]), 0)
    expect(result.value).toBe(16383)
    expect(result.bytesRead).toBe(2)
  })

  it('读取三字节 VLQ (16384 = 0x81 0x80 0x00)', () => {
    const result = readVLQ(new Uint8Array([0x81, 0x80, 0x00]), 0)
    expect(result.value).toBe(16384)
    expect(result.bytesRead).toBe(3)
  })

  it('读取四字节 VLQ (0xFF 0xFF 0xFF 0x7F = 268435455)', () => {
    const result = readVLQ(new Uint8Array([0xFF, 0xFF, 0xFF, 0x7F]), 0)
    expect(result.value).toBe(268435455)
    expect(result.bytesRead).toBe(4)
  })

  it('超过 4 字节时抛出异常', () => {
    expect(() => readVLQ(new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF, 0x7F]), 0)).toThrow(MIDIParseError)
  })

  it('截断的 VLQ 抛出异常（只有首字节，指示后续还有字节）', () => {
    expect(() => readVLQ(new Uint8Array([0x81]), 0)).toThrow(MIDIParseError)
  })

  it('支持非零偏移量', () => {
    const result = readVLQ(new Uint8Array([0x00, 0x7F, 0x00]), 1)
    expect(result.value).toBe(127)
    expect(result.bytesRead).toBe(1)
  })
})

// ──────────────────────────────────────────────
// 5.1 VLQ 写
// ──────────────────────────────────────────────

describe('writeVLQ', () => {
  it('编码 0 为 [0x00]', () => {
    expect(writeVLQ(0)).toEqual([0x00])
  })

  it('编码 127 为 [0x7F]', () => {
    expect(writeVLQ(127)).toEqual([0x7F])
  })

  it('编码 128 为 [0x81, 0x00]', () => {
    expect(writeVLQ(128)).toEqual([0x81, 0x00])
  })

  it('编码 16383 为 [0xFF, 0x7F]', () => {
    expect(writeVLQ(16383)).toEqual([0xFF, 0x7F])
  })

  it('编码 16384 为 [0x81, 0x80, 0x00]', () => {
    expect(writeVLQ(16384)).toEqual([0x81, 0x80, 0x00])
  })

  it('编码 268435455 为 [0xFF, 0xFF, 0xFF, 0x7F]', () => {
    expect(writeVLQ(268435455)).toEqual([0xFF, 0xFF, 0xFF, 0x7F])
  })

  it('负数抛出异常', () => {
    expect(() => writeVLQ(-1)).toThrow(MIDIParseError)
  })

  it('round-trip：读和写保持一致', () => {
    const values = [0, 1, 64, 127, 128, 255, 16383, 16384, 100000, 268435455]
    for (const v of values) {
      const bytes = writeVLQ(v)
      const result = readVLQ(new Uint8Array(bytes), 0)
      expect(result.value).toBe(v)
      expect(result.bytesRead).toBe(bytes.length)
    }
  })
})

// ──────────────────────────────────────────────
// 5.2 SMF 文件头解析
// ──────────────────────────────────────────────

describe('parseHeader', () => {
  it('解析 format 0 头部', () => {
    const data = new Uint8Array(makeHeader(0, 1, 480))
    const header = parseHeader(data, 0)
    expect(header.format).toBe(0)
    expect(header.trackCount).toBe(1)
    expect(header.ppq).toBe(480)
  })

  it('解析 format 1 头部', () => {
    const data = new Uint8Array(makeHeader(1, 3, 240))
    const header = parseHeader(data, 0)
    expect(header.format).toBe(1)
    expect(header.trackCount).toBe(3)
    expect(header.ppq).toBe(240)
  })

  it('无效 magic 抛出异常', () => {
    const data = new Uint8Array([
      0x4D, 0x54, 0x68, 0x65, // "MThe"
      0x00, 0x00, 0x00, 0x06,
      0x00, 0x01, 0x00, 0x01,
      0x01, 0xE0,
    ])
    expect(() => parseHeader(data, 0)).toThrow('Invalid MIDI header magic')
  })

  it('文件太小（< 14 字节）', () => {
    const data = new Uint8Array(10)
    expect(() => parseHeader(data, 0)).toThrow('File too small')
  })

  it('SMPTE 格式抛出异常（bit15=1）', () => {
    const data = new Uint8Array(makeHeader(1, 1, 0x8000 | 480))
    expect(() => parseHeader(data, 0)).toThrow('SMPTE timing format is not supported')
  })

  it('format 2 抛出异常', () => {
    const data = new Uint8Array(makeHeader(2, 1, 480))
    expect(() => parseHeader(data, 0)).toThrow('SMF format 2 not supported')
  })

  it('trackCount 为 0 抛出异常', () => {
    const data = new Uint8Array(makeHeader(0, 0, 480))
    expect(() => parseHeader(data, 0)).toThrow('MIDI file has no tracks')
  })

  it('PPQ 为 0 抛出异常', () => {
    const data = new Uint8Array(makeHeader(0, 1, 0))
    expect(() => parseHeader(data, 0)).toThrow('PPQ')
  })
})

// ──────────────────────────────────────────────
// 5.3 MIDI 事件解析
// ──────────────────────────────────────────────

describe('parseTrackEvents', () => {
  it('解析 Note On / Note Off 事件', () => {
    const data = new Uint8Array([
      ...noteOn(0, 60, 100),
      ...noteOff(240, 60, 0),
      ...endOfTrack(0),
    ])
    const events = parseTrackEvents(data)
    expect(events).toHaveLength(3)

    const noteOnEvent = events[0]!
    expect(noteOnEvent.kind).toBe('note')
    if (noteOnEvent.kind === 'note') {
      expect(noteOnEvent.note.type).toBe('noteOn')
      expect(noteOnEvent.note.pitch).toBe(60)
      expect(noteOnEvent.note.velocity).toBe(100)
      expect(noteOnEvent.note.channel).toBe(0)
      expect(noteOnEvent.note.absoluteTick).toBe(0)
    }

    const noteOffEvent = events[1]!
    expect(noteOffEvent.kind).toBe('note')
    if (noteOffEvent.kind === 'note') {
      expect(noteOffEvent.note.type).toBe('noteOff')
      expect(noteOffEvent.note.pitch).toBe(60)
      expect(noteOffEvent.note.absoluteTick).toBe(240)
    }

    const endEvent = events[2]!
    expect(endEvent.kind).toBe('meta')
    if (endEvent.kind === 'meta') {
      expect(endEvent.meta.metaType).toBe(0x2F)
      expect(endEvent.meta.absoluteTick).toBe(240)
    }
  })

  it('velocity=0 的 Note On 被视为 Note Off', () => {
    const data = new Uint8Array([
      ...noteOn(0, 60, 0),
      ...endOfTrack(0),
    ])
    const events = parseTrackEvents(data)
    expect(events).toHaveLength(2)
    const noteEvent = events[0]!
    expect(noteEvent.kind).toBe('note')
    if (noteEvent.kind === 'note') {
      expect(noteEvent.note.type).toBe('noteOff')
      expect(noteEvent.note.pitch).toBe(60)
    }
  })

  it('处理 Running Status', () => {
    // 第一个事件带完整状态，后续事件用运行状态
    const data = new Uint8Array([
      ...vlqBytes(0), 0x90, 60, 100,  // Note On, full status
      ...vlqBytes(120), 62, 90,       // Note On, running status (0x90 reused)
      ...vlqBytes(0), 0x80, 60, 0,    // Note Off, full status
      ...vlqBytes(120), 62, 0,        // Note Off, running status (0x80 reused)
      ...endOfTrack(0),
    ])
    const events = parseTrackEvents(data)
    expect(events).toHaveLength(5)

    // 验证 running status 事件
    const secondNoteOn = events[1]!
    expect(secondNoteOn.kind).toBe('note')
    if (secondNoteOn.kind === 'note') {
      expect(secondNoteOn.note.type).toBe('noteOn')
      expect(secondNoteOn.note.pitch).toBe(62)
      expect(secondNoteOn.note.velocity).toBe(90)
      expect(secondNoteOn.note.absoluteTick).toBe(120)
    }

    const lastNoteOff = events[3]!
    expect(lastNoteOff.kind).toBe('note')
    if (lastNoteOff.kind === 'note') {
      expect(lastNoteOff.note.type).toBe('noteOff')
      expect(lastNoteOff.note.pitch).toBe(62)
      expect(lastNoteOff.note.absoluteTick).toBe(240)
    }
  })

  it('解析 Program Change 事件', () => {
    const data = new Uint8Array([
      ...programChange(0, 5),
      ...endOfTrack(0),
    ])
    const events = parseTrackEvents(data)
    expect(events).toHaveLength(2)
    const pcEvent = events[0]!
    expect(pcEvent.kind).toBe('programChange')
    if (pcEvent.kind === 'programChange') {
      expect(pcEvent.program).toBe(5)
      expect(pcEvent.absoluteTick).toBe(0)
    }
  })

  it('解析 Control Change 事件（2 字节 channel 事件）', () => {
    const data = new Uint8Array([
      ...vlqBytes(0), 0xB0, 7, 100,  // Volume controller
      ...endOfTrack(0),
    ])
    const events = parseTrackEvents(data)
    expect(events).toHaveLength(2)
    expect(events[0]!.kind).toBe('other')
  })

  it('解析 Pitch Bend 事件', () => {
    const data = new Uint8Array([
      ...vlqBytes(0), 0xE0, 0x00, 0x40,
      ...endOfTrack(0),
    ])
    const events = parseTrackEvents(data)
    expect(events).toHaveLength(2)
    expect(events[0]!.kind).toBe('other')
  })

  it('解析 Channel Aftertouch 事件（1 字节）', () => {
    const data = new Uint8Array([
      ...vlqBytes(0), 0xD0, 64,
      ...endOfTrack(0),
    ])
    const events = parseTrackEvents(data)
    expect(events).toHaveLength(2)
    expect(events[0]!.kind).toBe('other')
  })

  it('多个 delta time 累加 correct', () => {
    const data = new Uint8Array([
      ...noteOn(0, 60, 100),
      ...noteOn(480, 62, 90),
      ...noteOn(960, 64, 80),
      ...endOfTrack(0),
    ])
    const events = parseTrackEvents(data)
    expect(events).toHaveLength(4)
    if (events[0]!.kind === 'note') expect(events[0]!.note.absoluteTick).toBe(0)
    if (events[1]!.kind === 'note') expect(events[1]!.note.absoluteTick).toBe(480)
    if (events[2]!.kind === 'note') expect(events[2]!.note.absoluteTick).toBe(1440)
  })
})

// ──────────────────────────────────────────────
// 5.4 Meta 事件解析
// ──────────────────────────────────────────────

describe('Meta events', () => {
  it('解析 Tempo meta 事件（FF 51 03）', () => {
    // BPM 120 => 60000000/120 = 500000 MPQN = 0x07A120
    const data = new Uint8Array([
      ...vlqBytes(0), 0xFF, 0x51, 0x03, 0x07, 0xA1, 0x20,
      ...endOfTrack(0),
    ])
    const events = parseTrackEvents(data)
    expect(events).toHaveLength(2)
    const meta = events[0]!
    expect(meta.kind).toBe('meta')
    if (meta.kind === 'meta') {
      expect(meta.meta.metaType).toBe(0x51)
      expect(meta.meta.data).toHaveLength(3)
      expect(meta.meta.data[0]).toBe(0x07)
      expect(meta.meta.data[1]).toBe(0xA1)
      expect(meta.meta.data[2]).toBe(0x20)
    }
  })

  it('解析 Time Signature meta 事件（FF 58 04）', () => {
    const data = new Uint8Array([
      ...vlqBytes(0), 0xFF, 0x58, 0x04, 0x06, 0x03, 0x30, 0x08,
      ...endOfTrack(0),
    ])
    const events = parseTrackEvents(data)
    expect(events).toHaveLength(2)
    const meta = events[0]!
    expect(meta.kind).toBe('meta')
    if (meta.kind === 'meta') {
      expect(meta.meta.metaType).toBe(0x58)
      expect(meta.meta.data[0]).toBe(6)
      expect(meta.meta.data[1]).toBe(3) // 分母为 2^3 = 8
    }
  })

  it('解析 Track Name meta 事件（FF 03）', () => {
    const nameBytes = [0x50, 0x69, 0x61, 0x6E, 0x6F] // "Piano"
    const data = new Uint8Array([
      ...vlqBytes(0), 0xFF, 0x03, 0x05, ...nameBytes,
      ...endOfTrack(0),
    ])
    const events = parseTrackEvents(data)
    expect(events).toHaveLength(2)
    const meta = events[0]!
    expect(meta.kind).toBe('meta')
    if (meta.kind === 'meta') {
      expect(meta.meta.metaType).toBe(0x03)
      expect(meta.meta.data).toEqual(new Uint8Array(nameBytes))
    }
  })

  it('解析 End of Track meta 事件（FF 2F 00）并停止', () => {
    const data = new Uint8Array([
      ...noteOn(0, 60, 100),
      ...endOfTrack(0),
      // 以下数据不应被解析
      ...noteOn(0, 62, 80),
    ])
    const events = parseTrackEvents(data)
    expect(events).toHaveLength(2)
  })

  it('解析带有 VLQ 长度 > 1 字节的 meta 事件', () => {
    // 构建一个长度 200 的文本 meta（VLQ 双字节）
    const text = new Array(200).fill(0x41) // 200 个 'A'
    const lenBytes = writeVLQ(200)
    const data = new Uint8Array([
      ...vlqBytes(0), 0xFF, 0x03, ...lenBytes, ...text,
      ...endOfTrack(0),
    ])
    const events = parseTrackEvents(data)
    expect(events).toHaveLength(2)
    const meta = events[0]!
    expect(meta.kind).toBe('meta')
    if (meta.kind === 'meta') {
      expect(meta.meta.metaType).toBe(0x03)
      expect(meta.meta.data).toHaveLength(200)
    }
  })
})

// ──────────────────────────────────────────────
// 5.5 SysEx 安全跳过
// ──────────────────────────────────────────────

describe('SysEx skipping', () => {
  it('跳过 F0 SysEx（带 VLQ 长度）', () => {
    const sysExData = [0x41, 0x10, 0x42, 0x12, 0x40, 0x00, 0x7F, 0x00, 0x41, 0xF7]
    const data = new Uint8Array([
      ...vlqBytes(0), 0xF0, ...vlqBytes(sysExData.length), ...sysExData,
      ...noteOn(0, 60, 100),
      ...endOfTrack(0),
    ])
    const events = parseTrackEvents(data)
    // SysEx 被忽略，只有 noteOn + endOfTrack
    expect(events).toHaveLength(3)
  })

  it('跳过 F7 SysEx（带 VLQ 长度）', () => {
    const sysExData = [0x41, 0x10, 0x42, 0xF7]
    const data = new Uint8Array([
      ...vlqBytes(0), 0xF7, ...vlqBytes(sysExData.length), ...sysExData,
      ...noteOn(0, 60, 100),
      ...endOfTrack(0),
    ])
    const events = parseTrackEvents(data)
    expect(events).toHaveLength(3)
  })
})

// ──────────────────────────────────────────────
// 5.6 / 5.7 完整解析与组装
// ──────────────────────────────────────────────

describe('parseSMF — 完整解析', () => {
  it('解析 format 1 MIDI 文件（1 条 tempo + 1 条 note 音轨）', () => {
    const midi = makeSimpleMIDI(480, 120)
    const project = parseSMF(new Uint8Array(midi))

    expect(project.ppq).toBe(480)
    expect(project.tracks).toHaveLength(1)
    expect(project.tempoMap).toHaveLength(1)
    expect(project.tempoMap[0]!.bpm).toBeCloseTo(120, 1)
    expect(project.tempoMap[0]!.tick).toBe(0)
    expect(project.tracks[0]!.notes).toHaveLength(1)
    expect(project.tracks[0]!.notes[0]!.pitch).toBe(60)
    expect(project.tracks[0]!.notes[0]!.startTick).toBe(0)
    expect(project.tracks[0]!.notes[0]!.duration).toBe(240)
    expect(project.tracks[0]!.notes[0]!.velocity).toBe(100)
  })

  it('解析 format 0 MIDI 文件', () => {
    // Format 0: 单音轨包含 tempo + note 事件
    const trackData = [
      ...tempoMeta(0, 120),
      ...noteOn(0, 60, 100),
      ...noteOff(240, 60, 0),
      ...endOfTrack(0),
    ]
    const midi = [
      ...makeHeader(0, 1, 480),
      ...makeTrack(trackData),
    ]
    const project = parseSMF(new Uint8Array(midi))

    expect(project.ppq).toBe(480)
    expect(project.tracks).toHaveLength(1)
    expect(project.tempoMap).toHaveLength(1)
    expect(project.tempoMap[0]!.bpm).toBeCloseTo(120, 1)
    expect(project.tracks[0]!.notes[0]!.pitch).toBe(60)
    expect(project.tracks[0]!.notes[0]!.duration).toBe(240)
  })

  it('解析 format 1 多音轨文件', () => {
    // Tempo track
    const tempoData = [
      ...tempoMeta(0, 140),
      ...endOfTrack(0),
    ]
    // Track 1: piano
    const track1Data = [
      ...programChange(0, 0),
      ...noteOn(0, 60, 100),
      ...noteOff(240, 60, 0),
      ...endOfTrack(0),
    ]
    // Track 2: bass
    const track2Data = [
      ...programChange(0, 33),
      ...noteOn(0, 36, 90),
      ...noteOff(480, 36, 0),
      ...endOfTrack(0),
    ]
    const midi = [
      ...makeHeader(1, 3, 480),
      ...makeTrack(tempoData),
      ...makeTrack(track1Data),
      ...makeTrack(track2Data),
    ]

    const project = parseSMF(new Uint8Array(midi))

    expect(project.tracks).toHaveLength(2)
    expect(project.tempoMap[0]!.bpm).toBeCloseTo(140, 1)

    // Track 1 (piano)
    expect(project.tracks[0]!.notes).toHaveLength(1)
    expect(project.tracks[0]!.notes[0]!.pitch).toBe(60)
    expect(project.tracks[0]!.notes[0]!.duration).toBe(240)

    // Track 2 (bass)
    expect(project.tracks[1]!.notes).toHaveLength(1)
    expect(project.tracks[1]!.notes[0]!.pitch).toBe(36)
    expect(project.tracks[1]!.notes[0]!.duration).toBe(480)
  })

  it('匹配跨多个 tick 的 Note On/Off 对', () => {
    const noteData = [
      ...noteOn(0, 60, 100),
      ...noteOn(0, 64, 90),
      ...noteOff(240, 60, 0),
      ...noteOff(0, 64, 0),
      ...endOfTrack(0),
    ]
    const midi = [
      ...makeHeader(1, 2, 480),
      ...makeTrack([...tempoMeta(0, 120), ...endOfTrack(0)]),
      ...makeTrack(noteData),
    ]

    const project = parseSMF(new Uint8Array(midi))
    expect(project.tracks[0]!.notes).toHaveLength(2)
    // Both notes start at tick 0
    expect(project.tracks[0]!.notes[0]!.startTick).toBe(0)
    expect(project.tracks[0]!.notes[1]!.startTick).toBe(0)
    // Note 1 (pitch 60) has duration 240
    expect(project.tracks[0]!.notes.find(n => n.pitch === 60)!.duration).toBe(240)
    // Note 2 (pitch 64) has duration 240 (240 + 0 delta)
    expect(project.tracks[0]!.notes.find(n => n.pitch === 64)!.duration).toBe(240)
  })

  it('Tempo track 的命名被提取', () => {
    const nameBytes = [0x43, 0x6F, 0x6E, 0x64, 0x75, 0x63, 0x74, 0x6F, 0x72] // "Conductor"
    const tempoData = [
      ...vlqBytes(0), 0xFF, 0x03, 0x09, ...nameBytes,
      ...tempoMeta(0, 120),
      ...endOfTrack(0),
    ]
    const noteData = [
      ...noteOn(0, 60, 100),
      ...endOfTrack(240),
    ]
    const midi = [
      ...makeHeader(1, 2, 480),
      ...makeTrack(tempoData),
      ...makeTrack(noteData),
    ]

    const project = parseSMF(new Uint8Array(midi))
    // Note track name extraction not including conductor name
    expect(project.tracks[0]!.name).toBe('Track 1')
  })

  it('没有 tempo 事件时使用默认值', () => {
    const noteData = [
      ...noteOn(0, 60, 100),
      ...endOfTrack(240),
    ]
    const midi = [
      ...makeHeader(1, 2, 480),
      ...makeTrack([...endOfTrack(0)]), // 空的 tempo track
      ...makeTrack(noteData),
    ]

    const project = parseSMF(new Uint8Array(midi))
    expect(project.tempoMap).toHaveLength(1)
    expect(project.tempoMap[0]!.bpm).toBe(120)
    expect(project.timeSigs).toHaveLength(1)
    expect(project.timeSigs[0]!.numerator).toBe(4)
    expect(project.timeSigs[0]!.denominator).toBe(4)
  })

  it('解析带有 time signature 的 MIDI 文件', () => {
    const tempoData = [
      ...tempoMeta(0, 120),
      ...timeSigMeta(0, 3, 4),
      ...endOfTrack(0),
    ]
    const noteData = [
      ...noteOn(0, 60, 100),
      ...endOfTrack(240),
    ]
    const midi = [
      ...makeHeader(1, 2, 480),
      ...makeTrack(tempoData),
      ...makeTrack(noteData),
    ]

    const project = parseSMF(new Uint8Array(midi))
    expect(project.timeSigs).toHaveLength(1)
    expect(project.timeSigs[0]!.tick).toBe(0)
    expect(project.timeSigs[0]!.numerator).toBe(3)
    expect(project.timeSigs[0]!.denominator).toBe(4)
  })

  it('通过 Running Status 匹配 Note Off', () => {
    // 使用运行状态：第一个事件是 Note On 0x90，后续事件重用此状态
    const noteData = [
      ...vlqBytes(0), 0x90, 60, 100,  // Note On, status = 0x90
      ...vlqBytes(240), 60, 0,         // Note Off (running status 0x90, velocity 0)
      ...endOfTrack(0),
    ]
    const midi = [
      ...makeHeader(1, 2, 480),
      ...makeTrack([...tempoMeta(0, 120), ...endOfTrack(0)]),
      ...makeTrack(noteData),
    ]

    const project = parseSMF(new Uint8Array(midi))
    expect(project.tracks[0]!.notes).toHaveLength(1)
    expect(project.tracks[0]!.notes[0]!.duration).toBe(240)
  })
})

// ──────────────────────────────────────────────
// 5.7 序列化
// ──────────────────────────────────────────────

describe('serializeSMF', () => {
  it('序列化一个空工程', () => {
    const project: Project = {
      ppq: 480,
      tracks: [
        { id: 'track-1', name: 'Test', instrument: 0, color: '#4A90D9', notes: [] },
      ],
      tempoMap: [{ tick: 0, bpm: 120 }],
      timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
    }

    const result = serializeSMF(project)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)

    // 验证是有效的 SMF：重新解析并对比
    const parsed = parseSMF(result)
    expect(parsed.ppq).toBe(480)
    expect(parsed.tracks).toHaveLength(1)
    expect(parsed.tempoMap[0]!.bpm).toBeCloseTo(120, 1)
  })

  it('序列化一个带音符的工程', () => {
    const project: Project = {
      ppq: 480,
      tracks: [
        {
          id: 'track-1',
          name: 'Piano',
          instrument: 0,
          color: '#4A90D9',
          notes: [
            { id: 'n1', pitch: 60, startTick: 0, duration: 240, velocity: 100 },
            { id: 'n2', pitch: 64, startTick: 240, duration: 240, velocity: 90 },
          ],
        },
      ],
      tempoMap: [{ tick: 0, bpm: 120 }],
      timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
    }

    const result = serializeSMF(project)
    const parsed = parseSMF(result)

    expect(parsed.tracks).toHaveLength(1)
    expect(parsed.tracks[0]!.notes).toHaveLength(2)

    // 顺序可能变化，按 pitch 查找
    const note60 = parsed.tracks[0]!.notes.find(n => n.pitch === 60)!
    const note64 = parsed.tracks[0]!.notes.find(n => n.pitch === 64)!
    expect(note60.startTick).toBe(0)
    expect(note60.duration).toBe(240)
    expect(note64.startTick).toBe(240)
    expect(note64.duration).toBe(240)
  })

  it('序列化时包含 Track Name meta 事件', () => {
    const project: Project = {
      ppq: 480,
      tracks: [
        {
          id: 'track-1',
          name: 'Steinway Piano',
          instrument: 0,
          color: '#4A90D9',
          notes: [
            { id: 'n1', pitch: 60, startTick: 0, duration: 240, velocity: 100 },
          ],
        },
      ],
      tempoMap: [{ tick: 0, bpm: 120 }],
      timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
    }

    const result = serializeSMF(project)
    const parsed = parseSMF(result)
    expect(parsed.tracks[0]!.name).toBe('Steinway Piano')
  })

  it('序列化多音轨工程', () => {
    const project: Project = {
      ppq: 480,
      tracks: [
        {
          id: 'track-1', name: 'Piano', instrument: 0, color: '#4A90D9',
          notes: [
            { id: 'n1', pitch: 60, startTick: 0, duration: 480, velocity: 100 },
          ],
        },
        {
          id: 'track-2', name: 'Bass', instrument: 33, color: '#FF5C72',
          notes: [
            { id: 'n2', pitch: 36, startTick: 0, duration: 960, velocity: 90 },
          ],
        },
      ],
      tempoMap: [{ tick: 0, bpm: 120 }],
      timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
    }

    const result = serializeSMF(project)
    const parsed = parseSMF(result)

    expect(parsed.tracks).toHaveLength(2)
    expect(parsed.tracks[0]!.instrument).toBe(0)
    expect(parsed.tracks[1]!.instrument).toBe(33)
  })

  it('完整 round-trip：序列化 → 解析 → 核对所有音符', () => {
    const original: Project = {
      ppq: 240,
      tracks: [
        {
          id: 'track-1',
          name: 'Piano',
          instrument: 0,
          color: '#4A90D9',
          notes: [
            { id: 'n1', pitch: 60, startTick: 0, duration: 120, velocity: 100 },
            { id: 'n2', pitch: 62, startTick: 120, duration: 120, velocity: 90 },
            { id: 'n3', pitch: 64, startTick: 240, duration: 240, velocity: 80 },
            { id: 'n4', pitch: 67, startTick: 480, duration: 360, velocity: 85 },
          ],
        },
        {
          id: 'track-2',
          name: 'Drums',
          instrument: 0,
          color: '#FF5C72',
          notes: [
            { id: 'n5', pitch: 36, startTick: 0, duration: 60, velocity: 100 },
            { id: 'n6', pitch: 42, startTick: 240, duration: 60, velocity: 100 },
          ],
        },
      ],
      tempoMap: [
        { tick: 0, bpm: 120 },
        { tick: 480, bpm: 140 },
      ],
      timeSigs: [
        { tick: 0, numerator: 4, denominator: 4 },
      ],
    }

    const serialized = serializeSMF(original)
    const parsed = parseSMF(serialized)

    // 验证 PPQ
    expect(parsed.ppq).toBe(240)

    // 验证 tempo map
    expect(parsed.tempoMap).toHaveLength(2)
    expect(parsed.tempoMap[0]!.bpm).toBeCloseTo(120, 1)
    expect(parsed.tempoMap[1]!.bpm).toBeCloseTo(140, 1)

    // 验证 time sig
    expect(parsed.timeSigs[0]!.numerator).toBe(4)
    expect(parsed.timeSigs[0]!.denominator).toBe(4)

    // 验证音轨
    expect(parsed.tracks).toHaveLength(2)

    // Track 1: Piano
    const pianoTrack = parsed.tracks[0]!
    expect(pianoTrack.name).toBe('Piano')
    expect(pianoTrack.notes).toHaveLength(4)
    expect(pianoTrack.notes.find(n => n.pitch === 60)!.duration).toBe(120)
    expect(pianoTrack.notes.find(n => n.pitch === 64)!.duration).toBe(240)
    expect(pianoTrack.notes.find(n => n.pitch === 67)!.duration).toBe(360)
    expect(pianoTrack.notes.find(n => n.pitch === 62)!.startTick).toBe(120)

    // Track 2: Drums
    const drumTrack = parsed.tracks[1]!
    expect(drumTrack.notes).toHaveLength(2)
    expect(drumTrack.notes.find(n => n.pitch === 36)!.startTick).toBe(0)
    expect(drumTrack.notes.find(n => n.pitch === 42)!.startTick).toBe(240)
  })
})

// ──────────────────────────────────────────────
// 5.8 / 5.9 File API
// ──────────────────────────────────────────────

describe('File API wrappers', () => {
  it('parseMIDIFromBuffer 正确解析 ArrayBuffer', () => {
    const midi = makeSimpleMIDI(480, 120)
    const buffer = new Uint8Array(midi).buffer
    const project = parseMIDIFromBuffer(buffer)
    expect(project.ppq).toBe(480)
    expect(project.tracks[0]!.notes).toHaveLength(1)
  })

  it('loadMIDIFile 从 File 对象解析', async () => {
    const midi = makeSimpleMIDI(480, 120)
    const blob = new Blob([new Uint8Array(midi)], { type: 'audio/midi' })
    const file = new File([blob], 'test.mid', { type: 'audio/midi' })

    const project = await loadMIDIFile(file)
    expect(project.ppq).toBe(480)
    expect(project.tracks[0]!.notes).toHaveLength(1)
  })

  it('loadMIDIFile 处理空文件', async () => {
    const blob = new Blob([], { type: 'audio/midi' })
    const file = new File([blob], 'empty.mid', { type: 'audio/midi' })

    await expect(loadMIDIFile(file)).rejects.toThrow(MIDIParseError)
  })
})

// ──────────────────────────────────────────────
// 5.10 错误处理
// ──────────────────────────────────────────────

describe('Error handling', () => {
  it('文件太小无法读取头部', () => {
    const data = new Uint8Array(10)
    expect(() => parseSMF(data)).toThrow(MIDIParseError)
  })

  it('无效的 MThd magic', () => {
    const data = new Uint8Array([
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x06,
      0x00, 0x01, 0x00, 0x01, 0x01, 0xE0,
    ])
    expect(() => parseSMF(data)).toThrow('Invalid MIDI header magic')
  })

  it('无效的 MTrk magic', () => {
    // 构建一个双轨 MIDI 文件，然后把第二个 MTrk 的 magic 改成无效值
    const tempoData = [...tempoMeta(0, 120), ...endOfTrack(0)]
    const noteData = [0x00, 0x90, 60, 100, 0x00, 0x80, 60, 0, 0x00, 0xFF, 0x2F, 0x00]
    const midi = Uint8Array.from([
      ...makeHeader(1, 2, 480),
      ...makeTrack(tempoData),
      ...makeTrack(noteData),
    ])
    // 第二个 MTrk 在 header(14) + 第一个 track(variable) 之后
    // 直接破坏第一个 track 的 MTrk 也会出错，所以我们破坏第二个
    // 第二个 MTrk 在偏移 14 + 8 + tempoData.length 处
    const offset2ndMTrk = 14 + 8 + tempoData.length
    const corrupted = new Uint8Array(midi)
    corrupted[offset2ndMTrk] = 0x00 // 将 "M" 改为 0x00
    expect(() => parseSMF(corrupted)).toThrow('Invalid track chunk magic')
  })

  it('音轨数据截断', () => {
    // 构建一个声明长度但数据不足的音轨
    const midiData: number[] = [
      ...makeHeader(1, 1, 480),
      // MTrk 头：声明长度为 1000，但实际数据不足
      0x4D, 0x54, 0x72, 0x6B,
      0x00, 0x00, 0x03, 0xE8, // 1000
    ]
    const data = new Uint8Array(midiData)
    expect(() => parseSMF(data)).toThrow('Truncated track chunk')
  })

  it('截断的 note 事件', () => {
    // 事件声明了 status 但没有足够的数据字节
    const trackData = [
      ...vlqBytes(0), 0x90, 60, // 缺少 velocity 字节
      ...endOfTrack(0),
    ]
    const midi = [
      ...makeHeader(1, 2, 480),
      ...makeTrack([...tempoMeta(0, 120), ...endOfTrack(0)]),
      ...makeTrack(trackData),
    ]
    expect(() => parseSMF(new Uint8Array(midi))).toThrow('Truncated note event')
  })

  it('截断的 meta 事件', () => {
    // meta 事件声明 3 字节长度但只有 1 字节可用
    // 注意：后面不放 endOfTrack，否则 extra 字节会被当作 meta data 吃掉
    const trackData = [
      0x00, 0xFF, 0x51, 0x03, 0x07, // 声明 3 字节，实际只有 1 字节
    ]
    const midi = [
      ...makeHeader(1, 1, 480),
      ...makeTrack(trackData),
    ]
    expect(() => parseSMF(new Uint8Array(midi))).toThrow('Truncated meta event data')
  })

  it('运行状态无前置状态', () => {
    const trackData = [
      ...vlqBytes(0), 60, 100, // 缺少状态字节，且没有前置运行状态
      ...endOfTrack(0),
    ]
    const midi = [
      ...makeHeader(1, 1, 480),
      ...makeTrack(trackData),
    ]
    expect(() => parseSMF(new Uint8Array(midi))).toThrow('Running status without prior status')
  })

  it('未知的 MIDI 状态字节', () => {
    const trackData = [
      ...vlqBytes(0), 0xF4, // Undefined system common
      ...endOfTrack(0),
    ]
    const midi = [
      ...makeHeader(1, 1, 480),
      ...makeTrack(trackData),
    ]
    expect(() => parseSMF(new Uint8Array(midi))).toThrow('Unsupported MIDI status byte')
  })

  it('format 0 无效头部', () => {
    const data = new Uint8Array(5)
    expect(() => parseSMF(data)).toThrow(MIDIParseError)
  })
})

// ──────────────────────────────────────────────
// 5.11 边界情况
// ──────────────────────────────────────────────

describe('Edge cases', () => {
  it('空 notes 数组的音轨序列化正常', () => {
    const project: Project = {
      ppq: 480,
      tracks: [
        { id: 'track-1', name: 'Empty', instrument: 0, color: '#4A90D9', notes: [] },
      ],
      tempoMap: [{ tick: 0, bpm: 120 }],
      timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
    }

    const result = serializeSMF(project)
    const parsed = parseSMF(result)
    expect(parsed.tracks).toHaveLength(1)
    expect(parsed.tracks[0]!.notes).toHaveLength(0)
  })

  it('duration 为 0 的音符会在 round-trip 中丢失', () => {
    // 0 duration 的 Note 是没有意义的——noteOn 和 noteOff 同时发生
    // 序列化器中会写入两个事件，解析器中 duration=0 的音符在解析时会被丢弃
    const project: Project = {
      ppq: 480,
      tracks: [
        {
          id: 'track-1', name: 'Test', instrument: 0, color: '#4A90D9',
          notes: [
            { id: 'n1', pitch: 60, startTick: 0, duration: 0, velocity: 100 },
          ],
        },
      ],
      tempoMap: [{ tick: 0, bpm: 120 }],
      timeSigs: [{ tick: 0, numerator: 4, denominator: 4 }],
    }

    const result = serializeSMF(project)
    const parsed = parseSMF(result)
    // duration=0 的音符在解析时被丢弃
    expect(parsed.tracks[0]!.notes).toHaveLength(0)
  })

  it('不匹配的 Note Off 被忽略', () => {
    const noteData = [
      ...noteOff(0, 60, 0), // 没有对应的 Note On
      ...noteOn(0, 62, 100), // Note On but no matching Note Off
      ...endOfTrack(0),
    ]
    const midi = [
      ...makeHeader(1, 2, 480),
      ...makeTrack([...tempoMeta(0, 120), ...endOfTrack(0)]),
      ...makeTrack(noteData),
    ]

    const project = parseSMF(new Uint8Array(midi))
    // unmatched Note Off is ignored, unmatched Note On is also ignored (no matching off)
    expect(project.tracks[0]!.notes).toHaveLength(0)
  })

  it('多通道 Note 在一轨中各自匹配', () => {
    // 相同音高但不同通道的音符不应互相干扰
    const trackData = [
      ...vlqBytes(0), 0x90, 60, 100,  // Note On ch0, pitch 60
      ...vlqBytes(0), 0x91, 60, 80,   // Note On ch1, pitch 60
      ...vlqBytes(480), 0x80, 60, 0,   // Note Off ch0, pitch 60
      ...vlqBytes(0), 0x81, 60, 0,     // Note Off ch1, pitch 60
      ...endOfTrack(0),
    ]
    const midi = [
      ...makeHeader(1, 2, 480),
      ...makeTrack([...tempoMeta(0, 120), ...endOfTrack(0)]),
      ...makeTrack(trackData),
    ]

    const project = parseSMF(new Uint8Array(midi))
    expect(project.tracks[0]!.notes).toHaveLength(2)
    // Both notes have pitch 60 and duration 480
    for (const note of project.tracks[0]!.notes) {
      expect(note.pitch).toBe(60)
      expect(note.duration).toBe(480)
    }
  })
})

// ──────────────────────────────────────────────
// 5.11 大型 VLQ 极限
// ──────────────────────────────────────────────

describe('VLQ extremes', () => {
  it('4 字节 VLQ 最大值 (0xFF 0xFF 0xFF 0x7F)', () => {
    const result = readVLQ(new Uint8Array([0xFF, 0xFF, 0xFF, 0x7F]), 0)
    expect(result.value).toBe(268435455)
    expect(result.bytesRead).toBe(4)
  })

  it('5 字节 VLQ 抛出异常', () => {
    // 5 字节 VLQ 在 MIDI 规范中不允许
    const bytes = [0xFF, 0xFF, 0xFF, 0xFF, 0x7F]
    expect(() => readVLQ(new Uint8Array(bytes), 0)).toThrow('VLQ exceeds maximum length')
  })

  it('VLQ round-trip 覆盖边界值', () => {
    const boundaryValues = [
      0, 1, 2, 0x7F, 0x80, 0x81, 0x3FFF, 0x4000,
      0x1FFFFF, 0x200000, 0xFFFFFFF,
      268435455, // 4 字节 VLQ 最大值
    ]
    for (const v of boundaryValues) {
      const encoded = writeVLQ(v)
      const { value, bytesRead } = readVLQ(new Uint8Array(encoded), 0)
      expect(value).toBe(v)
      expect(bytesRead).toBe(encoded.length)
    }
  })
})
