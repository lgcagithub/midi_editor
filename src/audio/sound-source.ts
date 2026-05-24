/** 音频源接口 —— 由音频引擎实现，供调度器驱动 */
export interface SoundSource {
  /** 开始一个音符 */
  noteOn(pitch: number, velocity: number, when: number): void
  /** 结束一个音符 */
  noteOff(pitch: number, when: number): void
  /** 切换乐器（音色程序号 0-127） */
  setInstrument(program: number): void
  /** 释放所有资源 */
  dispose(): void
}
