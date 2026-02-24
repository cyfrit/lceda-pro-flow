import type { PlaceTask } from './PlaceTask';

/**
 * Scheduler: 全局单例调度器
 *
 * 核心职责：
 * 1. 收集用户在当前同步代码块中创建的所有任务
 * 2. 在当前 JavaScript 执行栈清空后，统一批量异步执行（Batch Async Execution）
 * 3. 维护 tempId -> realEdaId 的映射，供后续操作引用
 *
 * Event Loop 机制解析：
 * ┌─────────────────────────────────────────────────────────────┐
 * │  JavaScript Event Loop                                       │
 * ├─────────────────────────────────────────────────────────────┤
 * │  1. 同步代码执行（Call Stack）                               │
 * │     - Place.Resistor.value('10k')  // 创建 Task，入队       │
 * │     - Place.Capacitor.value('1uF') // 创建 Task，入队       │
 * │     - console.log('Script End')    // 同步日志              │
 * │                                                              │
 * │  2. 调用栈清空 ✅                                            │
 * │                                                              │
 * │  3. 执行 Microtask Queue（微任务队列）                       │
 * │     - queueMicrotask(() => this.flush())  // 这里！         │
 * │     - 批量异步执行所有 Task（await task.execute()）          │
 * │     - Resolver 调用 EDA API 搜索元件                         │
 * │     - 调用 eda.sch.PrimitiveComponent.create() 放置          │
 * │                                                              │
 * │  4. 执行 Macrotask Queue（宏任务：setTimeout, I/O...）      │
 * └─────────────────────────────────────────────────────────────┘
 *
 * 关键设计点：
 * - enqueue() 中使用 queueMicrotask 而非 setTimeout
 * - 因为 Microtask 优先级更高，会在当前 tick 结束后立即执行
 * - 保证同一批次的链式调用（.value().at().rot()）都已完成
 * - 只触发一次 flush()，即使 enqueue 被调用多次
 */
export class Scheduler {
	private static instance: Scheduler;
	private taskQueue: PlaceTask[] = [];
	private isFlushScheduled = false;
	private tempIdCounter = 0;
	private tempIdMap = new Map<string, string>(); // tempId -> realEdaId

	// 用于追踪所有 pending 的 Promise resolvers
	private pendingResolvers = new Map<string, () => void>();

	private constructor() {}

	public static getInstance(): Scheduler {
		if (!Scheduler.instance) {
			Scheduler.instance = new Scheduler();
		}
		return Scheduler.instance;
	}

	/**
	 * 生成临时 ID（在真实 EDA ID 生成前使用）
	 * 这个 ID 立即可用，可以在 Connect/Route 等操作中引用
	 */
	public generateTempId(): string {
		return `temp_${++this.tempIdCounter}`;
	}

	/**
	 * 添加任务到队列，并自动安排执行
	 *
	 * 执行时机保证：
	 * 1. 第一次 enqueue 时，安排一个 microtask 执行 flush()
	 * 2. 后续的 enqueue 只是把 Task 加入队列，不会重复安排 flush
	 * 3. 当前同步代码全部执行完毕后，microtask 中的 flush() 才会运行
	 * 4. flush() 会一次性处理队列中的所有 Task
	 */
	public enqueue(task: PlaceTask): void {
		this.taskQueue.push(task);

		// 关键：只在第一次入队时安排 flush
		if (!this.isFlushScheduled) {
			this.isFlushScheduled = true;

			// 使用 queueMicrotask 而非 Promise.resolve().then()
			// 保证在当前 tick 的 microtask phase 执行
			queueMicrotask(() => this.flush());
		}
	}

	/**
	 * 注册一个 Promise resolver，供 Builder 的 PromiseLike 实现使用
	 */
	public registerResolver(tempId: string, resolver: () => void): void {
		this.pendingResolvers.set(tempId, resolver);
	}

	/**
	 * 批量异步执行所有任务
	 *
	 * 执行流程：
	 * 1. 取出当前队列的所有 Task（snapshot）
	 * 2. 清空队列，重置标志位
	 * 3. 并行执行每个 Task：
	 *    - 调用 Task.execute() → Resolver 异步搜索 → EDA API 放置
	 *    - 获得真实 EDA 图元 ID
	 *    - 建立 tempId -> realEdaId 映射
	 *    - resolve 对应的 Promise
	 * 4. 输出批处理完成日志
	 */
	private async flush(): Promise<void> {
		const tasks = [...this.taskQueue];
		this.taskQueue = [];
		this.isFlushScheduled = false;

		console.log(`\n🔄 Scheduler: Flushing ${tasks.length} task(s)...`);
		console.log(`📍 [Microtask Phase] Current call stack is empty, executing batch...\n`);

		// 并行执行所有任务
		const promises = tasks.map(async (task) => {
			try {
				// 执行任务：异步调用 EDA API
				const realEdaId = await task.execute();

				if (realEdaId) {
					// 建立 tempId -> realEdaId 映射
					this.tempIdMap.set(task.getTempId(), realEdaId);

					// Resolve 对应的 Promise（支持 await 语法）
					const resolver = this.pendingResolvers.get(task.getTempId());
					if (resolver) {
						resolver();
						this.pendingResolvers.delete(task.getTempId());
					}
				}
			} catch (error) {
				console.error(`❌ Task [${task.getTempId()}] execution failed:`, error);
			}
		});

		await Promise.all(promises);

		console.log(`✅ Scheduler: Batch execution completed.\n`);
	}

	/**
	 * 手动立即刷新队列（异步版本）
	 *
	 * 用途：
	 * - 用户手动调用 commit() 强制执行当前批次
	 * - 在代码中插入执行分界点，方便调试
	 * - 获取真实 EDA ID 后再继续下一批操作
	 *
	 * 与自动批处理的区别：
	 * - 自动批处理在 microtask 中异步执行
	 * - 手动刷新立即执行，但仍然是异步的
	 */
	public async flushNow(): Promise<void> {
		if (this.taskQueue.length > 0) {
			// 取消已安排的自动 flush（如果有）
			this.isFlushScheduled = false;
			// 立即执行
			await this.flush();
		}
	}

	/**
	 * For testing: 异步刷新（用于测试验证）
	 */
	public async forceFlush(): Promise<void> {
		return new Promise((resolve) => {
			queueMicrotask(async () => {
				if (this.taskQueue.length > 0) {
					await this.flush();
				}
				resolve();
			});
		});
	}

	/**
	 * 获取真实 EDA ID（批处理完成后可用）
	 * 用于后续操作（如 Connect）引用之前创建的元件
	 */
	public getRealId(tempId: string): string | undefined {
		return this.tempIdMap.get(tempId);
	}
}
