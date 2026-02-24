/**
 * Flow DSL Core Types
 *
 * 定义了 Flow 的核心数据结构：
 * - ComponentIntent: 用户输入的原始意图
 * - ComponentSpec: Resolver 解析后的完整规格
 * - PlaceCommand: 发送给 EDA 的最终命令
 * - FlowComponentHandle: 返回给用户的句柄
 * - ChainableHandle: 支持链式调用的句柄接口
 */

export type ComponentType = 'Resistor' | 'Capacitor';

// 用户输入的原始意图（Intent）
export interface ComponentIntent {
	type: ComponentType;
	// 直接指定 LCSC 编号（优先级最高，如 "C17414"）
	lcsc?: string;
	// 芯片型号（如 "STM32F103C8T6"、"NE555"）
	model?: string;
	// 用户对元件的语义描述，例如 "10k" 或 "1uF"
	value?: string;
	// 封装偏好，例如 "0603", "0805"
	pkg?: string;
	// 位置与角度（在 commit 前可选）
	x?: number;
	y?: number;
	rot?: number;
	// 用户的优先选择（例如特定厂商/料号）
	prefer?: string;
	// 额外的元数据，可用于 AI 解释或后续扩展
	meta?: Record<string, string>;
}

// Resolver 解析后得到的元件完整规格（ComponentSpec）
export interface ComponentSpec {
	type: ComponentType;
	value?: string; // 保留原始意图文字
	lcsc?: string; // LCSC 料号（如果解析成功）
	package: string; // 封装（footprint）
	footprint: string; // PCB 上的封装标识
	manufacturer?: string;
	prefer?: string; // 解析时命中的优先条件
	// EDA API 需要的字段
	uuid?: string; // 器件 UUID
	symbolUuid?: string; // 符号 UUID
	footprintUuid?: string; // 封装 UUID
	libraryUuid?: string; // 库 UUID
}

// 发送给 EDA 的最终命令结构（PlaceCommand）
export interface PlaceCommand {
	id: string; // 唯一请求 id
	action: 'place';
	component: ComponentSpec;
	position: { x: number; y: number };
	rotation: number; // degrees
	metadata?: Record<string, string>;
}

/**
 * 返回给用户的句柄（Auto-Commit 模式）
 *
 * 特性：
 * - 立即可用，包含 tempId（可在批处理完成前引用）
 * - ready Promise 用于等待批处理完成
 * - getRealId() 获取批处理后生成的真实 EDA ID
 *
 * 用途：
 * - 供后续操作（如 Connect）引用之前创建的元件
 * - 支持 AI 生成复杂的连接关系代码
 */
export interface FlowComponentHandle {
	tempId: string; // 临时 ID，用于在批处理完成前引用此元件
	type: ComponentType;
	// 意图数据（用户设置的参数）
	intent: Readonly<ComponentIntent>;
	// ready: Promise，等待批处理完成后 resolve
	ready: Promise<void>;
	// getRealId: 获取真实的 EDA ID（批处理后可用）
	getRealId: () => string | undefined;
}

/**
 * 可链式调用的 Handle
 *
 * 继承自 FlowComponentHandle，额外提供链式方法
 * 支持流畅的 API 设计：Place.Resistor.value('10k').at(10, 10)
 *
 * 注意：实现此接口的类还应实现 PromiseLike<FlowComponentHandle>
 * 以支持 await 语法：await Place.Resistor.value('10k')
 */
export interface ChainableHandle extends FlowComponentHandle {
	value: (v: string) => ChainableHandle;
	pkg: (p: string) => ChainableHandle;
	at: (x: number, y: number) => ChainableHandle;
	rot: (angle: number) => ChainableHandle;
	prefer: (s: string) => ChainableHandle;
	lcsc: (code: string) => ChainableHandle; // 直接指定 LCSC 编号
	model: (name: string) => ChainableHandle; // 指定芯片型号
}
