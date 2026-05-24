/** MIDI 音符 */
export interface Note {
  id: string
  /** MIDI 音高编号 (0-127) */
  pitch: number
  /** 开始位置（tick） */
  startTick: number
  /** 持续时间（tick） */
  duration: number
  /** 力度 (0-127) */
  velocity: number
}

/** 速度事件 */
export interface TempoEvent {
  /** 事件位置（tick） */
  tick: number
  /** 速度 (BPM) */
  bpm: number
}

/** 拍号事件 */
export interface TimeSigEvent {
  /** 事件位置（tick） */
  tick: number
  /** 拍号分子 */
  numerator: number
  /** 拍号分母 */
  denominator: number
}

/** 音轨 */
export interface Track {
  id: string
  name: string
  /** General MIDI 音色编号 (0-127) */
  instrument: number
  /** 显示颜色 */
  color: string
  /** 音符列表 */
  notes: Note[]
}

/** 工程文件 */
export interface Project {
  /** 每四分音符的 tick 数 */
  ppq: number
  /** 音轨列表 */
  tracks: Track[]
  /** 速度映射表 */
  tempoMap: TempoEvent[]
  /** 拍号列表 */
  timeSigs: TimeSigEvent[]
}
