/** 音频源接口 —— 由音频引擎实现，供调度器驱动 */
export interface SoundSource {
  /**
   * 开始一个音符
   * @param endTime - 可选；若提供则调度指数衰减包络（attack + decay），模拟钢琴延音效果
   */
  noteOn(pitch: number, velocity: number, when: number, endTime?: number): void
  /** 结束一个音符 */
  noteOff(pitch: number, when: number): void
  /** 切换乐器（音色程序号 0-127） */
  setInstrument(program: number): void
  /** 立即停止所有正在发声的音符并清理资源。用于 stop、pause、seek 操作时的快速静音 */
  stopAll(when: number): void
  /** 释放所有资源 */
  dispose(): void
}
