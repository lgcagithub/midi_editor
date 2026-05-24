/**
 * 12.3 TransportBar
 *
 * 底部传输控制栏：播放/暂停/停止/快进快退圆形按钮，
 * BPM/时间码等宽字体显示，网格选择器。
 */

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

  const isPlaying = transportState === 'playing'
  const isPaused = transportState === 'paused'

  // 从 tempoMap 获取当前 BPM（取最后一个或默认 120）
  const currentBpm = tempoMap.length > 0 ? tempoMap[tempoMap.length - 1]!.bpm : 120

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
