import type { EDADeviceSearchItem, EDALibrarySearchOptions } from './types';
import { EDAApiError } from './types';

/**
 * 库 API - 封装 eda.lib 相关调用
 *
 * 提供器件、符号、封装的搜索和查询功能
 */

/**
 * 按 LCSC 编号搜索器件
 *
 * @param lcscCode - 立创商城编号（如 "C17414"）
 * @param libraryUuid - 库 UUID（可选，默认为系统库）
 * @param allowMultiMatch - 是否允许匹配多个结果
 * @returns 器件搜索结果数组
 */
export async function getDeviceByLcscId(
	lcscCode: string,
	libraryUuid?: string,
	allowMultiMatch: boolean = false,
): Promise<EDADeviceSearchItem[]> {
	try {
		// @ts-expect-error eda 是全局对象
		const results = await eda.lib.Device.getByLcscIds(lcscCode, libraryUuid, allowMultiMatch);
		return results as EDADeviceSearchItem[];
	} catch (error) {
		throw new EDAApiError(`Failed to search device by LCSC ID: ${lcscCode}`, 'lib.Device.getByLcscIds', error);
	}
}

/**
 * 按关键字搜索器件
 *
 * @param keyword - 搜索关键字（型号、描述等）
 * @param options - 搜索选项
 * @returns 器件搜索结果数组
 */
export async function searchDevice(
	keyword: string,
	options: EDALibrarySearchOptions = {},
): Promise<EDADeviceSearchItem[]> {
	const { libraryUuid, itemsOfPage = 10, page = 0 } = options;

	try {
		// @ts-expect-error eda 是全局对象
		const results = await eda.lib.Device.search(keyword, libraryUuid, undefined, undefined, itemsOfPage, page);
		return results as EDADeviceSearchItem[];
	} catch (error) {
		throw new EDAApiError(`Failed to search device: ${keyword}`, 'lib.Device.search', error);
	}
}

/**
 * 获取系统库 UUID
 */
export async function getSystemLibraryUuid(): Promise<string> {
	try {
		// @ts-expect-error eda 是全局对象
		return await eda.lib.LibrariesList.getSystemLibraryUuid();
	} catch (error) {
		throw new EDAApiError('Failed to get system library UUID', 'lib.LibrariesList.getSystemLibraryUuid', error);
	}
}

/**
 * 获取个人库 UUID
 */
export async function getPersonalLibraryUuid(): Promise<string> {
	try {
		// @ts-expect-error eda 是全局对象
		return await eda.lib.LibrariesList.getPersonalLibraryUuid();
	} catch (error) {
		throw new EDAApiError('Failed to get personal library UUID', 'lib.LibrariesList.getPersonalLibraryUuid', error);
	}
}

/**
 * 获取工程库 UUID
 */
export async function getProjectLibraryUuid(): Promise<string> {
	try {
		// @ts-expect-error eda 是全局对象
		return await eda.lib.LibrariesList.getProjectLibraryUuid();
	} catch (error) {
		throw new EDAApiError('Failed to get project library UUID', 'lib.LibrariesList.getProjectLibraryUuid', error);
	}
}
