/**
 * 播放管理器 —— 桥接 React 状态层与音频引擎
 *
 * 单例模块，负责：
 * - 创建 AudioContext / OscillatorBank / Transport / Scheduler
 * - 提供 play / pause / stop / resumeAudio 接口
 * - 生命周期管理（init / destroy）
 */
import type { StoreApi, UseBoundStore } from 'zustand'
import type { StoreState } from '@/state/store'
import { createAudioContext, resumeAudioContext } from './audio-context'
import { Transport } from './transport'
import { Scheduler } from './scheduler'
import { OscillatorBank } from '@/audio/oscillator-bank'

// ============================================================
// 模块级状态
// ============================================================

let audioCtx: AudioContext | null = null
let oscBank: OscillatorBank | null = null
let transport: Transport | null = null
let scheduler: Scheduler | null = null
let initialized = false

// ============================================================
// 初始化 / 销毁
// ============================================================

export function initPlayback(
  store: UseBoundStore<StoreApi<StoreState>>,
): void {
  if (initialized) return

  audioCtx = createAudioContext()
  oscBank = new OscillatorBank(audioCtx)
  transport = new Transport(audioCtx, store)
  scheduler = new Scheduler(transport, oscBank, store, audioCtx)
  scheduler.start()

  initialized = true
}

export function destroyPlayback(): void {
  if (!initialized) return

  scheduler?.stop()
  oscBank?.dispose()
  audioCtx?.close()

  scheduler = null
  transport = null
  oscBank = null
  audioCtx = null
  initialized = false
}

// ============================================================
// 播放控制 — 委托给 Transport
// ============================================================

export function play(): void {
  resumeAudioCtx()
  transport?.play()
}

export function pause(): void {
  transport?.pause()
}

export function stop(): void {
  transport?.stop()
}

export function getTransport(): Transport | null {
  return transport
}

function resumeAudioCtx(): void {
  if (audioCtx) {
    resumeAudioContext(audioCtx)
  }
}
