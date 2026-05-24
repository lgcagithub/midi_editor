/** 默认 PPQ（每四分音符 tick 数） */
export const DEFAULT_PPQ = 480

/** 默认速度 (BPM) */
export const DEFAULT_BPM = 120

/** MIDI 音高最小值 (A0) */
export const PITCH_MIN = 21

/** MIDI 音高最大值 (C8) */
export const PITCH_MAX = 108

/** 力度最小值 */
export const VELOCITY_MIN = 0

/** 力度最大值 */
export const VELOCITY_MAX = 127

/** 88 键钢琴键数 */
export const PIANO_KEYS = 88

/** 8 轨默认颜色调色板 */
export const TRACK_COLORS: readonly string[] = [
  '#FF5C72',
  '#FFB347',
  '#7EC8E3',
  '#C3A6F4',
  '#4BC0A0',
  '#FF8A80',
  '#FFE566',
  '#D4A5F6',
] as const
