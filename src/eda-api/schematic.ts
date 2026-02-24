import type { EDADeviceCreateParams, EDASchPrimitiveComponent } from './types';
import { EDAApiError } from './types';

/**
 * 原理图 API - 封装 eda.sch 相关调用
 *
 * 提供原理图元件放置、导线连接等功能
 */

/**
 * 放置元件到原理图
 *
 * @param device - 器件参数（uuid + libraryUuid）
 * @param x - X 坐标
 * @param y - Y 坐标
 * @param options - 可选参数
 * @returns 放置的元件图元，失败返回 undefined
 */
export async function placeComponent(
	device: EDADeviceCreateParams,
	x: number,
	y: number,
	options: {
		subPartName?: string;
		rotation?: number;
		mirror?: boolean;
		addIntoBom?: boolean;
		addIntoPcb?: boolean;
	} = {},
): Promise<EDASchPrimitiveComponent | undefined> {
	const {
		subPartName,
		rotation = 0,
		mirror = false,
		addIntoBom = true,
		addIntoPcb = true,
	} = options;

	try {
		// @ts-expect-error eda 是全局对象
		const primitive = await eda.sch.PrimitiveComponent.create(
			device,
			x,
			y,
			subPartName,
			rotation,
			mirror,
			addIntoBom,
			addIntoPcb,
		);
		return primitive as EDASchPrimitiveComponent | undefined;
	} catch (error) {
		throw new EDAApiError(
			`Failed to place component: ${device.uuid} at (${x}, ${y})`,
			'sch.PrimitiveComponent.create',
			error,
		);
	}
}

/**
 * 获取原理图中所有元件
 *
 * @param allSchematicPages - 是否获取所有图页
 * @returns 元件图元数组
 */
export async function getAllComponents(allSchematicPages: boolean = true): Promise<EDASchPrimitiveComponent[]> {
	try {
		// @ts-expect-error eda 是全局对象
		const components = await eda.sch.PrimitiveComponent.getAll(undefined, allSchematicPages);
		return components as EDASchPrimitiveComponent[];
	} catch (error) {
		throw new EDAApiError('Failed to get all components', 'sch.PrimitiveComponent.getAll', error);
	}
}

/**
 * 删除元件
 *
 * @param primitiveIds - 元件图元 ID 数组
 */
export async function deleteComponents(primitiveIds: string[]): Promise<void> {
	try {
		// @ts-expect-error eda 是全局对象
		await eda.sch.PrimitiveComponent.delete(primitiveIds);
	} catch (error) {
		throw new EDAApiError(`Failed to delete components: ${primitiveIds}`, 'sch.PrimitiveComponent.delete', error);
	}
}

/**
 * 修改元件属性
 *
 * @param primitiveId - 元件图元 ID
 * @param properties - 属性键值对
 */
export async function modifyComponent(
	primitiveId: string,
	properties: Record<string, unknown>,
): Promise<void> {
	try {
		// @ts-expect-error eda 是全局对象
		await eda.sch.PrimitiveComponent.modify(primitiveId, properties);
	} catch (error) {
		throw new EDAApiError(`Failed to modify component: ${primitiveId}`, 'sch.PrimitiveComponent.modify', error);
	}
}
