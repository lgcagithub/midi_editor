import { Project } from '../types'
import { DEFAULT_PPQ, DEFAULT_BPM } from '../constants'

/**
 * 创建默认工程
 * 包含 1 个空音轨、默认 tempo map、默认拍号
 */
export function createDefaultProject(): Project {
  return {
    ppq: DEFAULT_PPQ,
    tracks: [
      {
        id: 'track-1',
        name: '钢琴',
        instrument: 0, // Acoustic Grand Piano
        color: '#4A90D9',
        notes: [],
      },
    ],
    tempoMap: [
      { tick: 0, bpm: DEFAULT_BPM },
    ],
    timeSigs: [
      { tick: 0, numerator: 4, denominator: 4 },
    ],
  }
}
