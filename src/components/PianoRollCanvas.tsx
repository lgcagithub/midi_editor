/**
 * PianoRollCanvas — 4 层 Canvas 容器
 *
 * CSS 叠放（position: absolute），尺寸自动同步。
 * 初始化 PianoRollOrchestrator 管理所有渲染和事件。
 */

import { useRef, useEffect } from 'react'
import { useStore } from '@/state/store'
import { PianoRollOrchestrator } from '@/renderer/piano-roll'

export default function PianoRollCanvas(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLCanvasElement>(null)
  const noteRef = useRef<HTMLCanvasElement>(null)
  const cursorRef = useRef<HTMLCanvasElement>(null)
  const interactionRef = useRef<HTMLCanvasElement>(null)
  const orchRef = useRef<PianoRollOrchestrator | null>(null)

  useEffect(() => {
    const grid = gridRef.current
    const note = noteRef.current
    const cursor = cursorRef.current
    const interaction = interactionRef.current
    const container = containerRef.current

    if (!grid || !note || !cursor || !interaction || !container) return

    const orch = new PianoRollOrchestrator(
      { grid, note, cursor, interaction },
      container,
      useStore,
    )
    orchRef.current = orch

    return () => {
      orch.destroy()
      orchRef.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--bg, #1A1819)',
      }}
    >
      {/* z-0 背景网格层 */}
      <canvas
        ref={gridRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* z-1 音符层 */}
      <canvas
        ref={noteRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* z-2 播放光标层 */}
      <canvas
        ref={cursorRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* z-3 交互层 */}
      <canvas
        ref={interactionRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
