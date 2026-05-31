/**
 * 12.6 RulerView
 *
 * 标尺 Canvas 容器组件。
 * - 初始化 RulerRenderer 绘制密度自适应刻度线
 * - 与 PianoRollView 共享 scrollX / CoordinateMapper
 * - 点击/拖拽标尺定位播放位置
 * - 响应视口变化（缩放、滚动）
 */

import { useRef, useEffect } from 'react'
import { useStore } from '@/state/store'
import { RulerRenderer } from '@/renderer/ruler-renderer'
import { createCoordinateMapper } from '@/renderer/coordinate-mapper'

// ============================================================
// RulerView 组件
// ============================================================

export default function RulerView(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<RulerRenderer | null>(null)

  const scrollX = useStore((s) => s.viewport.scrollX)
  const currentTick = useStore((s) => s.currentTick)
  const rulerHeight = useStore((s) => s.viewport.rulerHeight)
  const orientation = useStore((s) => s.orientation)
  const zoomX = useStore((s) => s.viewport.zoomX)
  const noteHeight = useStore((s) => s.viewport.noteHeight)
  const tempoMap = useStore((s) => s.tempoMap)
  const ppq = useStore((s) => s.ppq)

  // ---- 初始化 RulerRenderer ----
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    // 更新 Canvas 物理尺寸（DPR 感知）
    const updateCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = container.getBoundingClientRect()
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
    }
    updateCanvasSize()

    // 创建 CoordinateMapper
    const mapper = createCoordinateMapper(
      orientation,
      zoomX,
      noteHeight,
      tempoMap,
      ppq,
    )

    // 创建渲染器
    const renderer = new RulerRenderer(canvas, {
      mapper,
      getTempoMap: () => useStore.getState().tempoMap,
      getPpq: () => useStore.getState().ppq,
      getTimeSigs: () => useStore.getState().timeSigs,
    })
    rendererRef.current = renderer
    renderer.render()

    // 监听容器尺寸变化
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize()
      renderer.updateDPR()
      renderer.render()
    })
    resizeObserver.observe(container)

    // 清理
    return () => {
      resizeObserver.disconnect()
      renderer.dispose()
      rendererRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- 同步 scrollX ----
  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    renderer.setScrollX(scrollX)
    renderer.render()
  }, [scrollX])

  // ---- 同步 currentTick ----
  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    renderer.setCurrentTick(currentTick)
    renderer.render()
  }, [currentTick])

  // ---- 同步 CoordinateMapper（orientation / zoomX / noteHeight / tempoMap / ppq 变化） ----
  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return

    const mapper = createCoordinateMapper(
      orientation,
      zoomX,
      noteHeight,
      tempoMap,
      ppq,
    )
    renderer.updateMapper(mapper)
    renderer.render()
  }, [orientation, zoomX, noteHeight, tempoMap, ppq])

  return (
    <div
      ref={containerRef}
      style={{
        height: rulerHeight,
        flexShrink: 0,
        overflow: 'hidden',
        background: 'var(--bg, #1A1819)',
        borderBottom: '1px solid var(--border, #2E2927)',
        boxSizing: 'border-box',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  )
}
