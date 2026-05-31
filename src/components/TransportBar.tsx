/**
 * 12.3 TransportBar
 *
 * 底部传输控制栏：播放/暂停/停止/快进快退圆形按钮，
 * BPM/时间码等宽字体显示，网格选择器。
 */

import { useState, useEffect, useRef } from 'react'
import { useStore } from '@/state/store'
import GridSelector from './GridSelector'
import { tickToSeconds } from '@/model/time-convert'
import { play as playbackPlay, pause as playbackPause, stop as playbackStop } from '@/engine/playback-manager'

// ============================================================
// 常量
// ============================================================

/** 快进/快退步进 tick 数（约 1 拍 = PPQ） */
const SKIP_TICKS = 480

// ============================================================
// 样式
// ============================================================

const barStyle: React.CSSProperties = {
  height: 52,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '0 16px',
  background: 'var(--surface1, #242223)',
  borderTop: '1px solid var(--border, #2E2927)',
  flexShrink: 0,
}

const btnCircular: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid var(--border-visible, #423B38)',
  background: 'var(--surface2, #2E2927)',
  color: 'var(--text2, #A89D96)',
  cursor: 'pointer',
  fontSize: 16,
  transition: 'all 0.12s ease',
  outline: 'none',
}

const btnPlay: React.CSSProperties = {
  ...btnCircular,
  width: 40,
  height: 40,
  background: 'var(--accent, #FF6E82)',
  borderColor: 'var(--accent, #FF6E82)',
  color: '#FFFFFF',
  fontSize: 18,
}

const timecodeStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: 16,
  fontWeight: 400,
  color: 'var(--text1, #FAF9F8)',
  letterSpacing: '0.5px',
  minWidth: 120,
  textAlign: 'center' as const,
  userSelect: 'none' as const,
}

const bpmStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text2, #A89D96)',
  userSelect: 'none' as const,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
}

const bpmValueStyle: React.CSSProperties = {
  color: 'var(--text1, #FAF9F8)',
  minWidth: 32,
  textAlign: 'right' as const,
}

const spacerStyle: React.CSSProperties = {
  flex: 1,
}

// --- 模式切换按钮样式（Merengue 风格） ---

const toggleBtnBase: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid var(--border-visible, #423B38)',
  background: 'var(--surface2, #2E2927)',
  color: 'var(--text3, #7A6E68)',
  cursor: 'pointer',
  fontSize: 14,
  transition: 'all 0.15s ease',
  outline: 'none',
}

const toggleBtnActive: React.CSSProperties = {
  ...toggleBtnBase,
  background: 'rgba(255, 92, 114, 0.2)',
  borderColor: 'var(--accent, #FF5C72)',
  color: 'var(--accent, #FF5C72)',
}

/** 暂停行为下拉面板 */
const dropdownPanelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 36,
  right: 0,
  background: 'var(--surface2, #2E2927)',
  border: '1px solid var(--border-visible, #423B38)',
  borderRadius: 8,
  padding: '4px 0',
  zIndex: 100,
  minWidth: 160,
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 将 tick 格式化为 mm:ss.ms
 */
function formatTimecode(tick: number, ppq: number, tempoMap: Array<{ tick: number; bpm: number }>): string {
  const seconds = tickToSeconds(tick, tempoMap, ppq)
  const totalSec = Math.max(0, seconds)
  const min = Math.floor(totalSec / 60)
  const sec = Math.floor(totalSec % 60)
  const ms = Math.floor((totalSec - Math.floor(totalSec)) * 100)
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(ms).padStart(2, '0')}`
}

// ============================================================
// TransportBar 组件
// ============================================================

export default function TransportBar(): JSX.Element {
  const transportState = useStore((s) => s.transportState)
  const currentTick = useStore((s) => s.currentTick)
  const ppq = useStore((s) => s.ppq)
  const tempoMap = useStore((s) => s.tempoMap)
  const endBehavior = useStore((s) => s.endBehavior)
  const setEndBehavior = useStore((s) => s.setEndBehavior)
  const autoFollow = useStore((s) => s.autoFollow)
  const setAutoFollow = useStore((s) => s.setAutoFollow)
  const pauseBehavior = useStore((s) => s.pauseBehavior)
  const setPauseBehavior = useStore((s) => s.setPauseBehavior)

  const isPlaying = transportState === 'playing'
  const isPaused = transportState === 'paused'

  /** 暂停行为下拉打开状态 */
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 从 tempoMap 获取当前 BPM（取最后一个或默认 120）
  const currentBpm = tempoMap.length > 0 ? tempoMap[tempoMap.length - 1]!.bpm : 120

  // 点击外部关闭下拉
  useEffect(() => {
    if (!dropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  const handlePlayPause = () => {
    if (isPlaying) {
      playbackPause()
    } else {
      playbackPlay()
    }
  }

  const handleStop = () => {
    playbackStop()
  }

  const handleSkipBack = () => {
    const state = useStore.getState()
    const newTick = Math.max(0, state.currentTick - SKIP_TICKS)
    playbackStop()
    useStore.setState({ currentTick: newTick })
  }

  const handleSkipForward = () => {
    const state = useStore.getState()
    const newTick = state.currentTick + SKIP_TICKS
    playbackStop()
    useStore.setState({ currentTick: newTick })
  }

  return (
    <div style={barStyle}>
      {/* 快退 */}
      <button
        style={btnCircular}
        onClick={handleSkipBack}
        title="快退"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--surface3, #423B38)'
          e.currentTarget.style.color = 'var(--text1, #FAF9F8)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--surface2, #2E2927)'
          e.currentTarget.style.color = 'var(--text2, #A89D96)'
        }}
      >
        <i className="ph-duotone ph-rewind" />
      </button>

      {/* 播放/暂停 */}
      <button
        style={{
          ...btnPlay,
          ...(isPlaying
            ? { background: 'var(--warning, #F4A742)', borderColor: 'var(--warning, #F4A742)' }
            : {}),
        }}
        onClick={handlePlayPause}
        title={isPlaying ? '暂停' : isPaused ? '继续播放' : '播放'}
        onMouseEnter={(e) => {
          if (!isPlaying) {
            e.currentTarget.style.opacity = '0.85'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1'
        }}
      >
        <i className={`ph-duotone ${isPlaying ? 'ph-pause' : 'ph-play'}`} />
      </button>

      {/* 停止 */}
      <button
        style={btnCircular}
        onClick={handleStop}
        title="停止"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--surface3, #423B38)'
          e.currentTarget.style.color = 'var(--text1, #FAF9F8)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--surface2, #2E2927)'
          e.currentTarget.style.color = 'var(--text2, #A89D96)'
        }}
      >
        <i className="ph-duotone ph-stop" />
      </button>

      {/* 快进 */}
      <button
        style={btnCircular}
        onClick={handleSkipForward}
        title="快进"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--surface3, #423B38)'
          e.currentTarget.style.color = 'var(--text1, #FAF9F8)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--surface2, #2E2927)'
          e.currentTarget.style.color = 'var(--text2, #A89D96)'
        }}
      >
        <i className="ph-duotone ph-fast-forward" />
      </button>

      {/* 循环切换 */}
      <button
        style={endBehavior === 'loop' ? toggleBtnActive : toggleBtnBase}
        onClick={() => setEndBehavior(endBehavior === 'loop' ? 'stop' : 'loop')}
        title={endBehavior === 'loop' ? '循环模式（开启）' : '循环模式（关闭）'}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--surface3, #423B38)'
          e.currentTarget.style.color = 'var(--text1, #FAF9F8)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = ''
          e.currentTarget.style.color = ''
        }}
      >
        <i className="ph-duotone ph-repeat" />
      </button>

      {/* 自动跟随切换 */}
      <button
        style={autoFollow ? toggleBtnActive : toggleBtnBase}
        onClick={() => setAutoFollow(!autoFollow)}
        title={autoFollow ? '自动跟随（开启）' : '自动跟随（关闭）'}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--surface3, #423B38)'
          e.currentTarget.style.color = 'var(--text1, #FAF9F8)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = ''
          e.currentTarget.style.color = ''
        }}
      >
        <i className="ph-duotone ph-eye" />
      </button>

      {/* 暂停行为设置 */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          style={toggleBtnBase}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          title="暂停行为"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface3, #423B38)'
            e.currentTarget.style.color = 'var(--text1, #FAF9F8)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--surface2, #2E2927)'
            e.currentTarget.style.color = 'var(--text3, #7A6E68)'
          }}
        >
          <i className="ph-duotone ph-gear" />
        </button>
        {dropdownOpen && (
          <div style={dropdownPanelStyle}>
            <div
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                color: 'var(--text1, #FAF9F8)',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface3, #423B38)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              onClick={() => { setPauseBehavior('keep'); setDropdownOpen(false) }}
            >
              {pauseBehavior === 'keep' && (
                <i className="ph ph-check" style={{ color: 'var(--accent, #FF5C72)' }} />
              )}
              {pauseBehavior !== 'keep' && <span style={{ width: 16 }} />}
              Keep（停在当前位置）
            </div>
            <div
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                color: 'var(--text1, #FAF9F8)',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface3, #423B38)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              onClick={() => { setPauseBehavior('return'); setDropdownOpen(false) }}
            >
              {pauseBehavior === 'return' && (
                <i className="ph ph-check" style={{ color: 'var(--accent, #FF5C72)' }} />
              )}
              {pauseBehavior !== 'return' && <span style={{ width: 16 }} />}
              Return（回到播放起点）
            </div>
          </div>
        )}
      </div>

      {/* 时间码 */}
      <span style={timecodeStyle}>
        {formatTimecode(currentTick, ppq, tempoMap)}
      </span>

      {/* BPM */}
      <div style={bpmStyle}>
        <span>BPM</span>
        <span style={bpmValueStyle}>{Math.round(currentBpm)}</span>
      </div>

      <div style={spacerStyle} />

      {/* 网格选择器 */}
      <GridSelector />
    </div>
  )
}
