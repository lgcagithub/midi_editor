/**
 * MIDI 文件序列化器
 *
 * 将 Project 对象序列化为 SMF format 1 格式的二进制数据。
 * 输出结构：MThd 头 + Tempo Track + N 个音符音轨
 */

import { Project } from '@/types'
import { writeVLQ } from './midi-parser'

// ──────────────────────────────────────────────
// 音轨内部事件类型
// ──────────────────────────────────────────────

interface SerialEvent {
  tick: number
  type: 'noteOn' | 'noteOff'
  pitch: number
  velocity: number
}

interface SerialMetaEvent {
  tick: number
  type: 'meta'
  metaType: number
  data: number[]
}

interface SerialProgramChange {
  tick: number
  type: 'programChange'
  program: number
}

type TrackItem = SerialEvent | SerialMetaEvent | SerialProgramChange

// ──────────────────────────────────────────────
// 主入口
// ──────────────────────────────────────────────

/**
 * 将 Project 序列化为 SMF format 1 的 Uint8Array
 */
export function serializeSMF(project: Project): Uint8Array {
  const bytes: number[] = []

  // ── Header ──
  const trackCount = project.tracks.length + 1 // +1 是指挥音轨
  writeHeader(bytes, project.ppq, trackCount)

  // ── Tempo Track (Track 0) ──
  writeTempoTrack(bytes, project)

  // ── Note Tracks ──
  for (const track of project.tracks) {
    writeNoteTrack(bytes, track)
  }

  return new Uint8Array(bytes)
}

// ──────────────────────────────────────────────
// Header 写入
// ──────────────────────────────────────────────

function writeHeader(bytes: number[], ppq: number, trackCount: number): void {
  // "MThd"
  bytes.push(0x4D, 0x54, 0x68, 0x64)
  // chunk length (6)
  writeUint32(bytes, 6)
  // format (1)
  writeUint16(bytes, 1)
  // track count
  writeUint16(bytes, trackCount)
  // division / PPQ
  writeUint16(bytes, ppq)
}

// ──────────────────────────────────────────────
// Tempo Track
// ──────────────────────────────────────────────

function writeTempoTrack(bytes: number[], project: Project): void {
  const items: TrackItem[] = []

  // 收集 tempo 事件
  for (const t of project.tempoMap) {
    const mpqn = Math.round(60_000_000 / t.bpm)
    items.push({
      tick: t.tick,
      type: 'meta' as const,
      metaType: 0x51,
      data: [(mpqn >> 16) & 0xFF, (mpqn >> 8) & 0xFF, mpqn & 0xFF],
    })
  }

  // 收集拍号事件
  for (const ts of project.timeSigs) {
    const denominatorExp = Math.round(Math.log2(ts.denominator))
    items.push({
      tick: ts.tick,
      type: 'meta' as const,
      metaType: 0x58,
      data: [ts.numerator, denominatorExp, 0x30, 0x08],
    })
  }

  // End of Track
  items.push({
    tick: getLastTick(project),
    type: 'meta' as const,
    metaType: 0x2F,
    data: [],
  })

  writeTrackChunk(bytes, items)
}

// ──────────────────────────────────────────────
// Note Track
// ──────────────────────────────────────────────

function writeNoteTrack(bytes: number[], track: import('@/types').Track): void {
  const items: TrackItem[] = []

  // Track Name (FF 03)
  if (track.name) {
    const nameBytes = textToBytes(track.name)
    items.push({
      tick: 0,
      type: 'meta' as const,
      metaType: 0x03,
      data: nameBytes,
    })
  }

  // Program Change (C0 pp) — 使用 channel 0
  items.push({
    tick: 0,
    type: 'programChange' as const,
    program: track.instrument,
  })

  // Note On / Note Off 事件
  for (const note of track.notes) {
    items.push({
      tick: note.startTick,
      type: 'noteOn' as const,
      pitch: note.pitch,
      velocity: note.velocity,
    })
    items.push({
      tick: note.startTick + note.duration,
      type: 'noteOff' as const,
      pitch: note.pitch,
      velocity: 0,
    })
  }

  // End of Track
  items.push({
    tick: getNoteTrackLastTick(track),
    type: 'meta' as const,
    metaType: 0x2F,
    data: [],
  })

  writeTrackChunk(bytes, items)
}

// ──────────────────────────────────────────────
// Track Chunk 写入
// ──────────────────────────────────────────────

function writeTrackChunk(bytes: number[], items: TrackItem[]): void {
  // 先收集事件数据到临时缓冲区，以便计算 chunk 大小
  const chunkData: number[] = []

  // 按 tick 排序；相同 tick 内 Note Off 先于 Note On
  const sorted = [...items].sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick
    const orderA = getSortOrder(a)
    const orderB = getSortOrder(b)
    return orderA - orderB
  })

  let currentTick = 0
  for (const item of sorted) {
    const deltaTime = item.tick - currentTick
    currentTick = item.tick
    writeEvent(chunkData, item, deltaTime)
  }

  // MTrk header + chunk data
  bytes.push(0x4D, 0x54, 0x72, 0x6B) // "MTrk"
  writeUint32(bytes, chunkData.length)
  bytes.push(...chunkData)
}

// ──────────────────────────────────────────────
// 事件写入
// ──────────────────────────────────────────────

function writeEvent(bytes: number[], item: TrackItem, deltaTime: number): void {
  // Delta time (VLQ)
  bytes.push(...writeVLQ(deltaTime))

  switch (item.type) {
    case 'noteOn': {
      // 9n pp vv (channel 0)
      bytes.push(0x90, item.pitch, item.velocity)
      break
    }
    case 'noteOff': {
      // 8n pp vv (channel 0)
      bytes.push(0x80, item.pitch, item.velocity)
      break
    }
    case 'meta': {
      // FF tt ll ...data...
      bytes.push(0xFF, item.metaType)
      bytes.push(...writeVLQ(item.data.length))
      bytes.push(...item.data)
      break
    }
    case 'programChange': {
      // Cn pp (channel 0)
      bytes.push(0xC0, item.program)
      break
    }
  }
}

// ──────────────────────────────────────────────
// 辅助函数
// ──────────────────────────────────────────────

function writeUint16(bytes: number[], value: number): void {
  bytes.push((value >> 8) & 0xFF, value & 0xFF)
}

function writeUint32(bytes: number[], value: number): void {
  bytes.push(
    (value >> 24) & 0xFF,
    (value >> 16) & 0xFF,
    (value >> 8) & 0xFF,
    value & 0xFF,
  )
}

function getSortOrder(item: TrackItem): number {
  if (item.type === 'noteOff') return 0
  if (item.type === 'noteOn') return 1
  if (item.type === 'programChange') return 2
  if (item.type === 'meta') {
    // End of Track 最后
    if (item.metaType === 0x2F) return 99
    return 3
  }
  return 4
}

/**
 * 获取工程中最后发生的 tick（用于 End of Track）
 */
function getLastTick(project: Project): number {
  let maxTick = 0
  for (const t of project.tempoMap) {
    if (t.tick > maxTick) maxTick = t.tick
  }
  for (const ts of project.timeSigs) {
    if (ts.tick > maxTick) maxTick = ts.tick
  }
  for (const track of project.tracks) {
    for (const note of track.notes) {
      const end = note.startTick + note.duration
      if (end > maxTick) maxTick = end
    }
  }
  return maxTick
}

/**
 * 获取单个音轨中最后的 tick
 */
function getNoteTrackLastTick(track: import('@/types').Track): number {
  let maxTick = 0
  for (const note of track.notes) {
    const end = note.startTick + note.duration
    if (end > maxTick) maxTick = end
  }
  return maxTick
}

/**
 * 将字符串编码为 Latin-1 字节序列
 */
function textToBytes(text: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < text.length; i++) {
    bytes.push(text.charCodeAt(i) & 0xFF)
  }
  return bytes
}

// ──────────────────────────────────────────────
// 浏览器 File API 保存
// ──────────────────────────────────────────────

/**
 * 将 Project 保存为 MIDI 文件并触发浏览器下载
 */
export function downloadMIDIFile(project: Project, filename: string = 'output.mid'): void {
  const data = serializeSMF(project)
  const blob = new Blob([data], { type: 'audio/midi' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
