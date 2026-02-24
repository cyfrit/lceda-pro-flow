/**
 * EDA API 类型定义
 *
 * 封装嘉立创 EDA 专业版 API 的数据类型
 */

/**
 * 器件搜索结果（来自 eda.lib.Device）
 */
export interface EDADeviceSearchItem {
	uuid: string;
	name: string;
	lcsc?: string;
	symbolUuid: string;
	symbolName: string;
	footprintUuid: string;
	footprintName?: string;
	libraryUuid: string;
	manufacturer?: string;
	description?: string;
}

/**
 * 器件创建参数
 */
export interface EDADeviceCreateParams {
	uuid: string;
	libraryUuid: string;
}

/**
 * 原理图元件图元
 */
export interface EDASchPrimitiveComponent {
	id: string;
	uuid: string;
	name: string;
	position: { x: number; y: number };
	rotation: number;
	mirror: boolean;
}

/**
 * 库搜索选项
 */
export interface EDALibrarySearchOptions {
	libraryUuid?: string;
	itemsOfPage?: number;
	page?: number;
}

/**
 * EDA API 统一错误
 */
export class EDAApiError extends Error {
	constructor(
		message: string,
		public readonly apiMethod: string,
		public readonly originalError?: unknown,
	) {
		super(message);
		this.name = 'EDAApiError';
	}
}
