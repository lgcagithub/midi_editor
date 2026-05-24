/**
 * 12.6 TrackList
 *
 * 音轨侧栏列表。
 * 每项显示音轨色点 + 名称 + 乐器元信息。
 * 选中态显示 accent 颜色左边框。
 */

import { useStore } from '@/state/store'

// ============================================================
// 通用 MIDI 乐器名称映射（精简版）
// ============================================================

const INSTRUMENT_NAMES: Record<number, string> = {
  0: '三角钢琴',
  1: '亮音钢琴',
  2: '电子钢琴',
  3: '酒吧钢琴',
  4: '电钢琴 2',
  5: '击弦古钢琴',
  6: '羽管键琴',
  7: '克拉维纳',
  8: '钢弦吉他',
  9: '尼龙弦吉他',
  10: '闷音吉他',
  11: '爵士吉他',
  12: '清音吉他',
  13: '失真吉他',
  14: '吉他泛音',
  15: '原声贝斯',
  16: '电贝斯(指弹)',
  17: '电贝斯(拨片)',
  24: '手风琴',
  25: '口琴',
  26: '探戈手风琴',
  33: '电贝斯(指弹)',
  40: '小提琴',
  41: '中提琴',
  42: '大提琴',
  43: '低音提琴',
  46: '竖琴',
  48: '弦乐合奏',
  49: '弦乐合奏 2',
  54: '合唱',
  56: '小号',
  57: '长号',
  58: '大号',
  59: '圆号',
  60: '铜管乐',
  61: '铜管乐 2',
  65: '中音萨克斯',
  66: '次中音萨克斯',
  67: '高音萨克斯',
  68: '双簧管',
  69: '英国管',
  70: '巴松',
  71: '单簧管',
  72: '短笛',
  73: '长笛',
  74: '竖笛',
  75: '排萧',
  76: '瓶笛',
  79: '双簧管',
  81: '合成主音',
  89: '合成柔音',
  99: '合成音效',
  115: '打击乐',
  118: '合成打击乐',
}

function getInstrumentName(program: number): string {
  return INSTRUMENT_NAMES[program] ?? `音色 ${program}`
}

// ============================================================
// 样式
// ============================================================

const containerStyle: React.CSSProperties = {
  width: 200,
  flexShrink: 0,
  background: 'var(--surface1, #242223)',
  borderLeft: '1px solid var(--border, #2E2927)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const headerStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 11,
  fontFamily: 'var(--font-body, "Nunito Sans", sans-serif)',
  fontWeight: 700,
  color: 'var(--text4, #5C5450)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  borderBottom: '1px solid var(--border, #2E2927)',
  userSelect: 'none',
}

const listStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '4px 0',
}

const trackItemBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px 8px 10px',
  cursor: 'pointer',
  transition: 'background 0.12s ease',
  borderLeft: '3px solid transparent',
  userSelect: 'none',
}

const colorDotStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  flexShrink: 0,
}

const trackInfoStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  minWidth: 0,
  flex: 1,
}

const trackNameStyle: React.CSSProperties = {
  fontSize: 13,
  fontFamily: 'var(--font-body, "Nunito Sans", sans-serif)',
  fontWeight: 600,
  color: 'var(--text1, #FAF9F8)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const trackMetaStyle: React.CSSProperties = {
  fontSize: 10,
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  color: 'var(--text4, #5C5450)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const emptyStyle: React.CSSProperties = {
  padding: 24,
  textAlign: 'center',
  color: 'var(--text4, #5C5450)',
  fontSize: 12,
  fontFamily: 'var(--font-body, "Nunito Sans", sans-serif)',
}

// ============================================================
// TrackList 组件
// ============================================================

export default function TrackList(): JSX.Element {
  const tracks = useStore((s) => s.tracks)
  const activeTrackId = useStore((s) => s.activeTrackId)
  const setActiveTrackId = useStore((s) => s.setActiveTrackId)

  if (tracks.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>音轨</div>
        <div style={emptyStyle}>暂无音轨</div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        音轨
        <span style={{ marginLeft: 6, color: 'var(--text3, #7A706A)', fontWeight: 400 }}>
          {tracks.length}
        </span>
      </div>
      <div style={listStyle}>
        {tracks.map((track) => {
          const isActive = track.id === activeTrackId
          const noteCount = track.notes.length

          return (
            <div
              key={track.id}
              style={{
                ...trackItemBase,
                background: isActive ? 'var(--surface2, #2E2927)' : 'transparent',
                borderLeftColor: isActive ? 'var(--accent, #FF6E82)' : 'transparent',
              }}
              onClick={() => setActiveTrackId(track.id)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--surface2, #2E2927)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              {/* 色点 */}
              <div
                style={{
                  ...colorDotStyle,
                  background: track.color || 'var(--text4, #5C5450)',
                }}
              />

              {/* 音轨信息 */}
              <div style={trackInfoStyle}>
                <span style={trackNameStyle}>{track.name}</span>
                <span style={trackMetaStyle}>
                  {getInstrumentName(track.instrument)}
                  {noteCount > 0 && ` · ${noteCount} 个音符`}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
