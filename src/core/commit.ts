import { Scheduler } from './Scheduler';

/**
 * commit: 手动提交当前批次的所有操作
 *
 * 作用：
 * - 立即执行队列中的所有待处理任务
 * - 相当于在代码中插入一个执行分界线
 * - 提交后可以获取真实的 EDA ID
 *
 * 使用场景：
 * ```typescript
 * // 批次 1
 * const R1 = Place.Resistor.value('10k').at(10, 10);
 * const R2 = Place.Resistor.value('1k').at(20, 20);
 *
 * // 手动提交 - 立即执行上面的操作
 * await commit();
 *
 * // 现在可以使用真实 ID
 * console.log(R1.getRealId()); // "eda_xxx"
 *
 * // 批次 2
 * const C1 = Place.Capacitor.value('1uF').at(30, 30);
 * await commit();
 * ```
 *
 * 注意：
 * - 如果不手动调用 commit()，任务仍会在脚本结束时自动执行
 * - commit() 是异步的，使用 await 等待执行完成
 */
export async function commit(): Promise<void> {
	const scheduler = Scheduler.getInstance();

	// 异步执行
	await scheduler.flushNow();
}
