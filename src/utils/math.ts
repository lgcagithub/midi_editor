/**
 * 将值限制在指定范围内
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * 将 MIDI 音符编号转换为频率 (Hz)
 * 公式: 440 * 2^((pitch - 69) / 12)
 */
export function midiToHz(pitch: number): number {
  return 440 * Math.pow(2, (pitch - 69) / 12)
}
