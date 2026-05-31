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

/**
 * 暂停播放
 *
 * 1) 暂停 Transport（冻结 currentTick）
 * 2) 立即静音所有振荡器
 *
 * 暂停位置取决于 transportSlice 的 pauseBehavior：
 * - 'keep'（默认）：停留在暂停时的 tick
 * - 'return'：回卷到 lastStartTick（本次播放开始的 tick） */
export function pause(): void {
  transport?.pause()
  // 立即停止所有正在发声的振荡器
  if (audioCtx && oscBank) {
    oscBank.stopAll(audioCtx.currentTime)
  }
}

export function stop(): void {
  transport?.stop()
  // 立即停止所有正在发声的振荡器
  if (audioCtx && oscBank) {
    oscBank.stopAll(audioCtx.currentTime)
  }
}

export function getTransport(): Transport | null {
  return transport
}

/**
 * 跳转到指定 tick
 *
 * 1) 静音所有当前发声的音符
 * 2) 更新 Transport 位置
 * 3) 重置调度器窗口，丢弃已安排但未触发的事件 */
export function seekTo(tick: number): void {
  if (!audioCtx || !oscBank || !transport || !scheduler) return
  resumeAudioCtx()
  // 1. 静音所有当前发声的音符
  oscBank.stopAll(audioCtx.currentTime)
  // 2. 更新 Transport 位置
  transport.seekTo(tick)
  // 3. 重置调度器窗口
  scheduler.resetScheduleWindow()
}

function resumeAudioCtx(): void {
  if (audioCtx) {
    resumeAudioContext(audioCtx)
  }
}
