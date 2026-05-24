/**
 * 12.5 KeyboardView
 *
 * 钢琴键盘 Canvas 容器组件。
 * - 初始化 KeyboardRenderer 绘制 88 键
 * - 点击试听（OscillatorBank）
 * - 与 PianoRollView 同步垂直滚动
 */

import { useRef, useEffect } from 'react'
import { useStore } from '@/state/store'
import { KeyboardRenderer } from '@/renderer/keyboard-renderer'
import { createAudioContext, resumeAudioContext } from '@/engine/audio-context'
import { OscillatorBank } from '@/audio/oscillator-bank'

// ============================================================
// 常量
// ============================================================

/** 键盘区域宽度 (px) */
const KEYBOARD_WIDTH = 72

// ============================================================
// KeyboardView 组件
// ============================================================

export default function KeyboardView(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<KeyboardRenderer | null>(null)
  const oscBankRef = useRef<OscillatorBank | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const scrollY = useStore((s) => s.viewport.scrollY)
  const orientation = useStore((s) => s.orientation)
  const setViewport = useStore((s) => s.setViewport)

  // 从键盘高度推导 noteHeight 并同步到 store，确保 Piano Roll 行与键盘对齐
  const syncNoteHeight = (keyboardHeight: number) => {
    const whiteKeySize = keyboardHeight / 52
    const noteHeight = whiteKeySize * 7 / 12
    setViewport({ noteHeight })
  }

  // ---- 初始化 ----
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    // 创建音频上下文和振荡器
    const audioCtx = createAudioContext()
    const oscBank = new OscillatorBank(audioCtx)
    audioCtxRef.current = audioCtx
    oscBankRef.current = oscBank

    // 创建键盘渲染器
    const updateCanvasSize = () => {
      const parent = container.parentElement
      if (!parent) return
      const h = parent.clientHeight
      canvas.width = KEYBOARD_WIDTH * (window.devicePixelRatio || 1)
      canvas.height = h * (window.devicePixelRatio || 1)
      canvas.style.width = `${KEYBOARD_WIDTH}px`
      canvas.style.height = `${h}px`
    }
    updateCanvasSize()
    syncNoteHeight(canvas.clientHeight || 400)

    const renderer = new KeyboardRenderer(canvas, {
      width: KEYBOARD_WIDTH,
      height: canvas.clientHeight || 400,
      orientation: orientation,
      noteOn: (pitch: number) => {
        resumeAudioContext(audioCtx)
        oscBank.noteOn(pitch, 100, audioCtx.currentTime + 0.01)
      },
      noteOff: (pitch: number) => {
        oscBank.noteOff(pitch, audioCtx.currentTime + 0.02)
      },
    })
    rendererRef.current = renderer
    renderer.render()

    // 监听容器尺寸变化
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize()
      syncNoteHeight(canvas.clientHeight || 400)
      renderer.updateOptions({
        width: KEYBOARD_WIDTH,
        height: canvas.clientHeight,
        orientation,
      })
      renderer.render()
    })
    resizeObserver.observe(container)

    // 清理
    return () => {
      resizeObserver.disconnect()
      renderer.dispose()
      oscBank.dispose()
      audioCtx.close()
      rendererRef.current = null
      oscBankRef.current = null
      audioCtxRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- 同步滚动 ----
  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    renderer.setScrollPos(scrollY)
    renderer.render()
  }, [scrollY])

  // ---- 方向变化时重建渲染器 ----
  useEffect(() => {
    const renderer = rendererRef.current
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!renderer || !canvas || !container) return

    // 更新 canvas 尺寸
    const parent = container.parentElement
    if (parent) {
      const h = parent.clientHeight
      canvas.width = KEYBOARD_WIDTH * (window.devicePixelRatio || 1)
      canvas.height = h * (window.devicePixelRatio || 1)
      canvas.style.width = `${KEYBOARD_WIDTH}px`
      canvas.style.height = `${h}px`
      syncNoteHeight(h || 400)
    }

    renderer.updateOptions({
      width: KEYBOARD_WIDTH,
      height: canvas.clientHeight || 400,
      orientation,
    })
    renderer.render()
  }, [orientation])

  return (
    <div
      ref={containerRef}
      style={{
        width: KEYBOARD_WIDTH,
        flexShrink: 0,
        overflow: 'hidden',
        background: 'var(--bg, #1A1819)',
        borderRight: '1px solid var(--border, #2E2927)',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: `${KEYBOARD_WIDTH}px`,
        }}
      />
    </div>
  )
}
