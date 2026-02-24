import type { ComponentIntent, ComponentSpec, ComponentType } from '../core/types';
import { getDeviceByLcscId, searchDevice } from '../eda-api/library';
import type { EDADeviceSearchItem } from '../eda-api/types';

/**
 * SmartResolver: 将用户的模糊意图解析为具体的 ComponentSpec
 *
 * 解析策略：
 * 1. 直接指定 LCSC 编号 → 调用 getDeviceByLcscId()
 * 2. 芯片型号 → 调用 searchDevice() 搜索型号
 * 3. 语义描述（如"10k 电阻"）→ 调用 searchDevice() 搜索关键字
 */
export class SmartResolver {
	// 缓存已搜索的结果，避免重复查询
	private static searchCache = new Map<string, EDADeviceSearchItem>();

	/**
	 * resolve: 异步解析 ComponentIntent 为 ComponentSpec
	 *
	 * 解析优先级：
	 * 1. 直接指定 LCSC 编号（intent.lcsc）- 优先级最高
	 * 2. 芯片型号（intent.model）- 搜索型号
	 * 3. 语义查询（type + value + pkg）- 搜索关键字
	 * 4. Generic fallback - 返回通用规格
	 */
	// eslint-disable-next-line complexity
	public async resolve(intent: ComponentIntent): Promise<ComponentSpec> {
		const type: ComponentType = intent.type;

		// 优先级 1: 直接指定 LCSC 编号
		if (intent.lcsc) {
			const device = await this.searchByLcsc(intent.lcsc);
			if (device) {
				return this.deviceToSpec(device, type, intent);
			}
			// LCSC 编号未找到，返回用户指定的编号（可能是新料号）
			return this.createGenericSpec(type, intent);
		}

		// 优先级 2: 芯片型号查询
		if (intent.model) {
			const device = await this.searchByKeyword(intent.model);
			if (device) {
				return this.deviceToSpec(device, type, intent);
			}
		}

		// 优先级 3: 语义查询
		if (intent.value) {
			const keyword = `${type} ${intent.value}${intent.pkg ? ' ' + intent.pkg : ''}`;
			const device = await this.searchByKeyword(keyword);
			if (device) {
				return this.deviceToSpec(device, type, intent);
			}
		}

		// 优先级 4: Generic fallback
		return this.createGenericSpec(type, intent);
	}

	/**
	 * 将 EDA 器件搜索结果转换为 ComponentSpec
	 */
	private deviceToSpec(
		device: EDADeviceSearchItem,
		type: ComponentType,
		intent: ComponentIntent,
	): ComponentSpec {
		return {
			type,
			value: intent.value || device.name,
			lcsc: device.lcsc,
			package: device.footprintName || 'UNKNOWN',
			footprint: device.footprintName || 'UNKNOWN',
			manufacturer: device.manufacturer,
			prefer: intent.prefer,
			// EDA API 需要的字段
			uuid: device.uuid,
			symbolUuid: device.symbolUuid,
			footprintUuid: device.footprintUuid,
			libraryUuid: device.libraryUuid,
		};
	}

	/**
	 * 创建通用规格（当搜索失败时）
	 */
	private createGenericSpec(type: ComponentType, intent: ComponentIntent): ComponentSpec {
		const pkg = intent.pkg || '0805';
		return {
			type,
			value: intent.value,
			lcsc: 'GENERIC',
			package: pkg,
			footprint: `${type[0]}_${pkg}`,
			manufacturer: 'GENERIC',
			prefer: intent.prefer,
		};
	}

	/**
	 * 按 LCSC 编号搜索器件
	 */
	private async searchByLcsc(lcscCode: string): Promise<EDADeviceSearchItem | null> {
		// 检查缓存
		const cached = SmartResolver.searchCache.get(`lcsc:${lcscCode}`);
		if (cached) {
			console.log(`✅ [Resolver] Cache hit: ${lcscCode}`);
			return cached;
		}

		try {
			console.log(`🔍 [Resolver] Searching LCSC: ${lcscCode}`);

			const results = await getDeviceByLcscId(lcscCode, undefined, false);

			if (results && results.length > 0) {
				const device = results[0];
				console.log(`✅ [Resolver] Found: ${device.name} (${device.lcsc})`);

				// 缓存结果
				SmartResolver.searchCache.set(`lcsc:${lcscCode}`, device);

				return device;
			}

			console.warn(`⚠️ [Resolver] No result for LCSC: ${lcscCode}`);
			return null;
		} catch (error) {
			console.error(`❌ [Resolver] Error searching LCSC ${lcscCode}:`, error);
			return null;
		}
	}

	/**
	 * 按关键字搜索器件
	 */
	private async searchByKeyword(keyword: string): Promise<EDADeviceSearchItem | null> {
		// 检查缓存
		const cached = SmartResolver.searchCache.get(`kw:${keyword}`);
		if (cached) {
			console.log(`✅ [Resolver] Cache hit: ${keyword}`);
			return cached;
		}

		try {
			console.log(`🔍 [Resolver] Searching: ${keyword}`);

			const results = await searchDevice(keyword, { itemsOfPage: 10, page: 0 });

			if (results && results.length > 0) {
				const device = results[0];
				console.log(`✅ [Resolver] Found: ${device.name}`);

				// 缓存结果
				SmartResolver.searchCache.set(`kw:${keyword}`, device);

				return device;
			}

			console.warn(`⚠️ [Resolver] No result for: ${keyword}`);
			return null;
		} catch (error) {
			console.error(`❌ [Resolver] Error searching ${keyword}:`, error);
			return null;
		}
	}
}
