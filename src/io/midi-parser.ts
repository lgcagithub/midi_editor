/**
 * MIDI 文件解析器
 *
 * 支持 SMF format 0 和 1 格式的解析。
 * 不支持 SMPTE 时间码和 format 2。
 */

import { Note, Project, TempoEvent, TimeSigEvent } from '@/types'
import { DEFAULT_BPM } from '@/constants'

// ──────────────────────────────────────────────
// 错误类型
// ──────────────────────────────────────────────

export class MIDIParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MIDIParseError'
  }
}

// ──────────────────────────────────────────────
// 内部辅助类型
// ──────────────────────────────────────────────

interface SMFHeader {
  format: number
  trackCount: number
  ppq: number
}

export interface ParsedNoteEvent {
  absoluteTick: number
  type: 'noteOn' | 'noteOff'
  channel: number
  pitch: number
  velocity: number
}

export interface ParsedMetaEvent {
  absoluteTick: number
  metaType: number
  data: Uint8Array
}

type GenericEvent =
  | { kind: 'note'; note: ParsedNoteEvent }
  | { kind: 'meta'; meta: ParsedMetaEvent }
  | { kind: 'programChange'; absoluteTick: number; channel: number; program: number }
  | { kind: 'other'; absoluteTick: number }

// ──────────────────────────────────────────────
// VLQ 读写
// ──────────────────────────────────────────────

/**
 * 读取变长量（Variable Length Quantity）
 * 每个字节的 bit7=1 表示后续还有字节，bits 0-6 为数据位
 * 最多 4 字节（28 位有效数据）
 */
export function readVLQ(bytes: Uint8Array, offset: number): { value: number; bytesRead: number } {
  let value = 0
  for (let i = 0; i < 4; i++) {
    const b = bytes[offset + i]
    if (b === undefined) {
      throw new MIDIParseError('Truncated VLQ: unexpected end of data')
    }
    value = (value << 7) | (b & 0x7F)
    if ((b & 0x80) === 0) {
      return { value, bytesRead: i + 1 }
    }
  }
  throw new MIDIParseError('VLQ exceeds maximum length of 4 bytes')
}

/**
 * 将数值编码为 VLQ 字节序列
 */
export function writeVLQ(value: number): number[] {
  if (value < 0) {
    throw new MIDIParseError('VLQ cannot encode negative values')
  }
  if (value === 0) {
    return [0]
  }
  const bytes: number[] = []
  let v = value
  while (v > 0) {
    bytes.unshift(v & 0x7F)
    v >>>= 7
  }
  // 除最后一个字节外，其余字节的 bit7 置 1
  for (let i = 0; i < bytes.length - 1; i++) {
    bytes[i]! |= 0x80
  }
  return bytes
}

// ──────────────────────────────────────────────
// 底层二进制读取
// ──────────────────────────────────────────────

function readUint16(bytes: Uint8Array, offset: number): number {
  if (offset + 2 > bytes.length) {
    throw new MIDIParseError('Truncated data: cannot read uint16')
  }
  return (bytes[offset]! << 8) | bytes[offset + 1]!
}

function readUint32(bytes: Uint8Array, offset: number): number {
  if (offset + 4 > bytes.length) {
    throw new MIDIParseError('Truncated data: cannot read uint32')
  }
  return (
    ((bytes[offset]! << 24) |
      (bytes[offset + 1]! << 16) |
      (bytes[offset + 2]! << 8) |
      bytes[offset + 3]!) >>>
    0
  )
}

function readString(bytes: Uint8Array, offset: number, length: number): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += String.fromCharCode(bytes[offset + i]!)
  }
  return result
}

// ──────────────────────────────────────────────
// 头部解析
// ──────────────────────────────────────────────

/**
 * 解析 SMF 文件头（MThd chunk）
 * 标准头部固定 14 字节
 */
export function parseHeader(bytes: Uint8Array, offset?: number): SMFHeader {
  const off = offset ?? 0

  if (off + 14 > bytes.length) {
    throw new MIDIParseError('File too small: cannot read MIDI header (need at least 14 bytes)')
  }

  const magic = readString(bytes, off, 4)
  if (magic !== 'MThd') {
    throw new MIDIParseError(`Invalid MIDI header magic: expected "MThd", got "${magic}"`)
  }

  const chunkLength = readUint32(bytes, off + 4)
  if (chunkLength < 6) {
    throw new MIDIParseError(`Invalid MThd chunk length: ${chunkLength}`)
  }

  const format = readUint16(bytes, off + 8)
  if (format > 1) {
    throw new MIDIParseError(`SMF format ${format} not supported (only formats 0 and 1 are supported)`)
  }

  const trackCount = readUint16(bytes, off + 10)
  if (trackCount === 0) {
    throw new MIDIParseError('MIDI file has no tracks')
  }

  const division = readUint16(bytes, off + 12)

  // bit15=1 表示 SMPTE 格式
  if (division & 0x8000) {
    throw new MIDIParseError('SMPTE timing format is not supported')
  }

  const ppq = division & 0x7FFF
  if (ppq === 0) {
    throw new MIDIParseError('PPQ ( ticks per quarter note) cannot be zero')
  }

  return { format, trackCount, ppq }
}

// ──────────────────────────────────────────────
// Track Chunk 解析
// ──────────────────────────────────────────────

interface TrackChunk {
  data: Uint8Array
  /** 8 字节头 + chunk 数据长度 */
  chunkTotalSize: number
}

function parseTrackChunk(bytes: Uint8Array, offset: number): TrackChunk {
  if (offset + 8 > bytes.length) {
    throw new MIDIParseError('Truncated data: cannot read track chunk header')
  }

  const magic = readString(bytes, offset, 4)
  if (magic !== 'MTrk') {
    throw new MIDIParseError(`Invalid track chunk magic: expected "MTrk", got "${magic}"`)
  }

  const chunkSize = readUint32(bytes, offset + 4)
  if (offset + 8 + chunkSize > bytes.length) {
    throw new MIDIParseError(
      `Truncated track chunk: declared size ${chunkSize} exceeds available data`,
    )
  }

  return {
    data: bytes.slice(offset + 8, offset + 8 + chunkSize),
    chunkTotalSize: 8 + chunkSize,
  }
}

// ──────────────────────────────────────────────
// 事件解析
// ──────────────────────────────────────────────

/**
 * 解析音轨数据中的全部事件
 * 返回按 absoluteTick 升序排列的事件列表
 */
export function parseTrackEvents(data: Uint8Array): GenericEvent[] {
  const events: GenericEvent[] = []
  let offset = 0
  let lastStatus = 0
  let absoluteTick = 0

  while (offset < data.length) {
    // 尝试读取一个事件
    const result = parseSingleEvent(data, offset, lastStatus)
    offset += result.bytesRead
    lastStatus = result.newLastStatus
    absoluteTick += result.event.deltaTime

    switch (result.event.kind) {
      case 'note':
        events.push({
          kind: 'note',
          note: {
            absoluteTick,
            type: result.event.noteType,
            channel: result.event.channel,
            pitch: result.event.pitch,
            velocity: result.event.velocity,
          },
        })
        break
      case 'meta':
        events.push({
          kind: 'meta',
          meta: {
            absoluteTick,
            metaType: result.event.metaType,
            data: result.event.metaData,
          },
        })
        // End of Track 标记
        if (result.event.metaType === 0x2F) {
          return events
        }
        break
      case 'programChange':
        events.push({
          kind: 'programChange',
          absoluteTick,
          channel: result.event.channel,
          program: result.event.program,
        })
        break
      case 'other':
        events.push({ kind: 'other', absoluteTick })
        break
    }
  }

  return events
}

// ──────────────────────────────────────────────
// 单事件解析（内部）
// ──────────────────────────────────────────────

type InternalEventResult =
  | {
      kind: 'note'
      deltaTime: number
      noteType: 'noteOn' | 'noteOff'
      channel: number
      pitch: number
      velocity: number
    }
  | {
      kind: 'meta'
      deltaTime: number
      metaType: number
      metaData: Uint8Array
    }
  | {
      kind: 'programChange'
      deltaTime: number
      channel: number
      program: number
    }
  | {
      kind: 'other'
      deltaTime: number
    }

interface SingleEventParseResult {
  event: InternalEventResult
  bytesRead: number
  newLastStatus: number
}

function parseSingleEvent(
  data: Uint8Array,
  offset: number,
  lastStatus: number,
): SingleEventParseResult {
  // 1) 读取 delta time (VLQ)
  const vlq = readVLQ(data, offset)
  let pos = offset + vlq.bytesRead
  const deltaTime = vlq.value

  // 2) 状态字节（或运行状态）
  if (pos >= data.length) {
    throw new MIDIParseError('Truncated event: missing data after delta time')
  }

  let status: number
  if (data[pos]! >= 0x80) {
    status = data[pos]!
    pos++
  } else if (lastStatus !== 0) {
    status = lastStatus
    // pos 保持不动——当前字节是运行状态命令的第一个数据字节
  } else {
    throw new MIDIParseError('Running status without prior status byte')
  }

  // ── Channel Voice Messages (0x80 – 0xEF) ──
  if (status >= 0x80 && status <= 0xEF) {
    const highNibble = status & 0xF0
    const channel = status & 0x0F

    switch (highNibble) {
      case 0x80: // Note Off
      case 0x90: {
        // Note On
        if (pos + 2 > data.length) {
          throw new MIDIParseError('Truncated note event')
        }
        const pitch = data[pos]!
        const velocity = data[pos + 1]!
        const isNoteOn = highNibble === 0x90 && velocity > 0
        pos += 2

        return {
          event: {
            kind: 'note',
            deltaTime,
            noteType: isNoteOn ? 'noteOn' : 'noteOff',
            channel,
            pitch,
            velocity,
          },
          bytesRead: pos - offset,
          newLastStatus: status,
        }
      }

      case 0xA0: // Polyphonic Aftertouch
      case 0xB0: // Control Change
      case 0xE0: {
        // Pitch Bend — 2 字节
        if (pos + 2 > data.length) {
          throw new MIDIParseError('Truncated 2-byte channel event')
        }
        pos += 2
        return {
          event: { kind: 'other', deltaTime },
          bytesRead: pos - offset,
          newLastStatus: status,
        }
      }

      case 0xC0: {
        // Program Change — 1 字节
        if (pos + 1 > data.length) {
          throw new MIDIParseError('Truncated program change event')
        }
        const program = data[pos]!
        pos += 1
        return {
          event: { kind: 'programChange', deltaTime, channel, program },
          bytesRead: pos - offset,
          newLastStatus: status,
        }
      }

      case 0xD0: {
        // Channel Aftertouch — 1 字节
        if (pos + 1 > data.length) {
          throw new MIDIParseError('Truncated channel aftertouch event')
        }
        pos += 1
        return {
          event: { kind: 'other', deltaTime },
          bytesRead: pos - offset,
          newLastStatus: status,
        }
      }

      default:
        throw new MIDIParseError(`Unknown channel voice status: 0x${status.toString(16)}`)
    }
  }

  // ── Meta Events (0xFF) ──
  if (status === 0xFF) {
    if (pos >= data.length) {
      throw new MIDIParseError('Truncated meta event: missing type byte')
    }
    const metaType = data[pos]!
    pos++

    const lenResult = readVLQ(data, pos)
    pos += lenResult.bytesRead

    if (pos + lenResult.value > data.length) {
      throw new MIDIParseError('Truncated meta event data')
    }
    const metaData = pos + lenResult.value <= data.length
      ? data.slice(pos, pos + lenResult.value)
      : new Uint8Array(0)
    pos += lenResult.value

    return {
      event: { kind: 'meta', deltaTime, metaType, metaData },
      bytesRead: pos - offset,
      newLastStatus: lastStatus, // Meta 事件不改变运行状态
    }
  }

  // ── SysEx (0xF0, 0xF7) ──
  if (status === 0xF0 || status === 0xF7) {
    const lenResult = readVLQ(data, pos)
    pos += lenResult.bytesRead
    if (pos + lenResult.value > data.length) {
      throw new MIDIParseError('Truncated SysEx data')
    }
    pos += lenResult.value

    return {
      event: { kind: 'other', deltaTime },
      bytesRead: pos - offset,
      newLastStatus: lastStatus, // SysEx 不改变运行状态
    }
  }

  // ── 未识别的系统消息 ──
  throw new MIDIParseError(`Unsupported MIDI status byte: 0x${status.toString(16)}`)
}

// ──────────────────────────────────────────────
// 元事件提取
// ──────────────────────────────────────────────

/**
 * 从事件列表中提取 Tempo 和 Time Signature
 */
function extractTempoAndTimeSig(events: GenericEvent[]): {
  tempoMap: TempoEvent[]
  timeSigs: TimeSigEvent[]
  trackName: string
} {
  const tempoMap: TempoEvent[] = []
  const timeSigs: TimeSigEvent[] = []
  let trackName = ''

  for (const ev of events) {
    if (ev.kind !== 'meta') continue
    const { absoluteTick, metaType, data } = ev.meta

    switch (metaType) {
      case 0x51: {
        // Tempo: FF 51 03 tt tt tt (微秒/四分音符)
        if (data.length >= 3) {
          const mpqn =
            ((data[0]! << 16) | (data[1]! << 8) | data[2]!) >>> 0
          if (mpqn > 0) {
            const bpm = 60_000_000 / mpqn
            tempoMap.push({ tick: absoluteTick, bpm: Math.round(bpm * 100) / 100 })
          }
        }
        break
      }
      case 0x58: {
        // Time Signature: FF 58 04 nn dd cc bb
        if (data.length >= 4) {
          const numerator = data[0]!
          const denominator = 1 << data[1]! // 分母是 2 的幂
          timeSigs.push({ tick: absoluteTick, numerator, denominator })
        }
        break
      }
      case 0x03: {
        // Track Name
        if (data.length > 0 && trackName === '') {
          trackName = decodeText(data)
        }
        break
      }
    }
  }

  return { tempoMap, timeSigs, trackName }
}

/**
 * 从元事件数据中解码文本
 * MIDI 文件中通常使用 ASCII 或 Latin-1
 */
function decodeText(data: Uint8Array): string {
  // Treat as Latin-1 / extended ASCII
  const chars: string[] = []
  for (let i = 0; i < data.length; i++) {
    chars.push(String.fromCharCode(data[i]!))
  }
  return chars.join('')
}

// ──────────────────────────────────────────────
// 音符匹配（Note On / Note Off）
// ──────────────────────────────────────────────

/**
 * 从事件列表中提取所有通道的 program number
 * 返回通道号到 program 的映射
 */
function extractProgramsFromEvents(events: GenericEvent[]): Map<number, number> {
  const programs = new Map<number, number>()
  for (const ev of events) {
    if (ev.kind === 'programChange') {
      // 只保留每个通道最后遇到的 program change
      programs.set(ev.channel, ev.program)
    }
  }
  return programs
}

// ──────────────────────────────────────────────
// 主入口：SMF → Project
// ──────────────────────────────────────────────

/**
 * 解析 SMF 文件为 Project 对象
 *
 * format 0 — 单个音轨，从中提取 tempo/timeSig 和所有通道的 note
 * format 1 — 音轨 0 为指挥音轨，其余为音符音轨
 */
export function parseSMF(bytes: Uint8Array): Project {
  const header = parseHeader(bytes, 0)
  let offset = 14 // 头部固定 14 字节

  const { format, trackCount, ppq } = header

  // 解析所有音轨
  const rawTrackData: Uint8Array[] = []
  for (let i = 0; i < trackCount; i++) {
    const chunk = parseTrackChunk(bytes, offset)
    rawTrackData.push(chunk.data)
    offset += chunk.chunkTotalSize
  }

  // 解析每个音轨的事件
  const allTrackEvents = rawTrackData.map((data) => parseTrackEvents(data))

  // 全局 note id 计数器
  let globalNoteIndex = 0

  // 额外轨道名提取（第一轨道或者根据情况）
  if (format === 0) {
    // format 0：从唯一音轨中提取 tempo/timeSig 和 notes
    const events = allTrackEvents[0]!
    const { tempoMap, timeSigs } = extractTempoAndTimeSig(events)
    const programs = extractProgramsFromEvents(events)

    // 提取所有音符（跨通道放到一个音轨中，或按通道分离）
    // 简化：按通道分组创建多个音轨
    const channelEvents = new Map<number, Note[]>()
    const activeNotes = new Map<number, Map<number, ParsedNoteEvent>>()

    for (const ev of events) {
      if (ev.kind !== 'note') continue
      const { absoluteTick, type, channel, pitch, velocity } = ev.note

      if (type === 'noteOn') {
        let chNotes = activeNotes.get(channel)
        if (!chNotes) {
          chNotes = new Map()
          activeNotes.set(channel, chNotes)
        }
        chNotes.set(pitch, { absoluteTick, type, channel, pitch, velocity })
      } else {
        const chNotes = activeNotes.get(channel)
        const pending = chNotes?.get(pitch)
        if (pending) {
          const duration = absoluteTick - pending.absoluteTick
          if (duration > 0) {
            let notesForChannel = channelEvents.get(channel)
            if (!notesForChannel) {
              notesForChannel = []
              channelEvents.set(channel, notesForChannel)
            }
            notesForChannel.push({
              id: `note-${globalNoteIndex++}`,
              pitch: pending.pitch,
              startTick: pending.absoluteTick,
              duration,
              velocity: pending.velocity,
            })
          }
          chNotes!.delete(pitch)
        }
      }
    }

    const tracks = Array.from(channelEvents.entries())
      .sort(([a], [b]) => a - b)
      .map(([channel, notes]) => {
        const prog = programs.get(channel) ?? 0
        return {
          id: `track-ch${channel + 1}`,
          name: `Channel ${channel + 1}`,
          instrument: prog,
          color: '#4A90D9',
          notes,
        }
      })

    // 如果没有 note event，创建一个空音轨
    if (tracks.length === 0) {
      tracks.push({
        id: 'track-1',
        name: 'MIDI Track',
        instrument: 0,
        color: '#4A90D9',
        notes: [],
      })
    }

    // 确保 tempoMap 至少包含 tick 0 事件
    const finalTempoMap = tempoMap.length > 0 ? tempoMap : [{ tick: 0, bpm: DEFAULT_BPM }]
    const finalTimeSigs = timeSigs.length > 0 ? timeSigs : [{ tick: 0, numerator: 4, denominator: 4 }]

    return { ppq, tracks, tempoMap: finalTempoMap, timeSigs: finalTimeSigs }
  }

  // ── format 1 ──
  const conductorEvents = allTrackEvents[0] ?? []
  const { tempoMap, timeSigs } = extractTempoAndTimeSig(conductorEvents)

  // 确保 tempoMap 至少包含 tick 0 事件
  const finalTempoMap = tempoMap.length > 0 ? tempoMap : [{ tick: 0, bpm: DEFAULT_BPM }]
  const finalTimeSigs = timeSigs.length > 0 ? timeSigs : [{ tick: 0, numerator: 4, denominator: 4 }]

  const tracks = allTrackEvents.slice(1).map((events, index) => {
    const { tempoMap: _, timeSigs: __, trackName } = extractTempoAndTimeSig(events)
    const programs = extractProgramsFromEvents(events)

    // 确定使用的 program number
    const program = programs.get(0) ?? 0

    // 匹配音符
    const activeNotes = new Map<number, Map<number, ParsedNoteEvent>>()
    const notes: Note[] = []

    for (const ev of events) {
      if (ev.kind !== 'note') continue
      const { absoluteTick, type, channel, pitch, velocity } = ev.note

      if (type === 'noteOn') {
        let chNotes = activeNotes.get(channel)
        if (!chNotes) {
          chNotes = new Map()
          activeNotes.set(channel, chNotes)
        }
        chNotes.set(pitch, { absoluteTick, type, channel, pitch, velocity })
      } else {
        const chNotes = activeNotes.get(channel)
        const pending = chNotes?.get(pitch)
        if (pending) {
          const duration = absoluteTick - pending.absoluteTick
          if (duration > 0) {
            notes.push({
              id: `note-${globalNoteIndex++}`,
              pitch: pending.pitch,
              startTick: pending.absoluteTick,
              duration,
              velocity: pending.velocity,
            })
          }
          chNotes!.delete(pitch)
        }
      }
    }

    const name = trackName || `Track ${index + 1}`

    return {
      id: `track-${index + 1}`,
      name,
      instrument: program,
      color: '#4A90D9',
      notes,
    }
  })

  // 如果没有任何音轨，创建一个默认空音轨
  if (tracks.length === 0) {
    tracks.push({
      id: 'track-1',
      name: 'MIDI Track',
      instrument: 0,
      color: '#4A90D9',
      notes: [],
    })
  }

  return { ppq, tracks, tempoMap: finalTempoMap, timeSigs: finalTimeSigs }
}

// ──────────────────────────────────────────────
// 浏览器 File API 加载
// ──────────────────────────────────────────────

/**
 * 从 ArrayBuffer 解析 MIDI 文件
 */
export function parseMIDIFromBuffer(buffer: ArrayBuffer): Project {
  const bytes = new Uint8Array(buffer)
  return parseSMF(bytes)
}

/**
 * 从 File 对象加载 MIDI 文件
 */
export async function loadMIDIFile(file: File): Promise<Project> {
  const buffer = await file.arrayBuffer()
  return parseMIDIFromBuffer(buffer)
}
