import type { ComponentIntent, ComponentSpec, ComponentType } from '../core/types';

/**
 * 器件搜索结果（来自 EDA API）
 */
interface DeviceSearchResult {
	uuid: string;
	name: string;
	lcsc?: string;
	symbolUuid: string;
	symbolName: string;
	footprintUuid: string;
	footprintName?: string;
	libraryUuid: string;
	manufacturer?: string;
}

/**
 * SmartResolver: 将用户的模糊意图解析为具体的 ComponentSpec
 *
 * 解析策略：
 * 1. 直接指定 LCSC 编号 → 调用 eda.lib.Device.getByLcscIds()
 * 2. 芯片型号 → 调用 eda.lib.Device.search() 搜索型号
 * 3. 语义描述（如"10k 电阻"）→ 调用 eda.lib.Device.search() 搜索关键字
 */
export class SmartResolver {
	// 缓存已搜索的结果，避免重复查询
	private static searchCache = new Map<string, DeviceSearchResult>();

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
				return {
					type,
					value: intent.value || device.name,
					lcsc: device.lcsc,
					package: device.footprintName || 'UNKNOWN',
					footprint: device.footprintName || 'UNKNOWN',
					manufacturer: device.manufacturer,
					prefer: intent.prefer,
					// 保存 EDA 需要的引用
					...(device as any),
				};
			}
			// LCSC 编号未找到，返回用户指定的编号（可能是新料号）
			return {
				type,
				value: intent.value || intent.model,
				lcsc: intent.lcsc,
				package: intent.pkg || 'UNKNOWN',
				footprint: intent.pkg ? `${type[0]}_${intent.pkg}` : 'UNKNOWN',
				prefer: intent.prefer,
			};
		}

		// 优先级 2: 芯片型号查询
		if (intent.model) {
			const device = await this.searchByKeyword(intent.model);
			if (device) {
				return {
					type,
					value: intent.model,
					lcsc: device.lcsc,
					package: device.footprintName || 'UNKNOWN',
					footprint: device.footprintName || 'UNKNOWN',
					manufacturer: device.manufacturer,
					prefer: intent.prefer,
					...(device as any),
				};
			}
		}

		// 优先级 3: 语义查询
		if (intent.value) {
			const keyword = `${type} ${intent.value}${intent.pkg ? ' ' + intent.pkg : ''}`;
			const device = await this.searchByKeyword(keyword);
			if (device) {
				return {
					type,
					value: intent.value,
					lcsc: device.lcsc,
					package: device.footprintName || intent.pkg || 'UNKNOWN',
					footprint: device.footprintName || intent.pkg || 'UNKNOWN',
					manufacturer: device.manufacturer,
					prefer: intent.prefer,
					...(device as any),
				};
			}
		}

		// 优先级 4: Generic fallback
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
	private async searchByLcsc(lcscCode: string): Promise<DeviceSearchResult | null> {
		// 检查缓存
		const cached = SmartResolver.searchCache.get(`lcsc:${lcscCode}`);
		if (cached) {
			console.log(`✅ [Resolver] Cache hit: ${lcscCode}`);
			return cached;
		}

		try {
			console.log(`🔍 [Resolver] Searching LCSC: ${lcscCode}`);

			// 调用 EDA API
			// @ts-expect-error eda 是全局对象
			const results = await eda.lib.Device.getByLcscIds(lcscCode, undefined, false);

			if (results && Array.isArray(results) && results.length > 0) {
				const device = results[0] as DeviceSearchResult;
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
	private async searchByKeyword(keyword: string): Promise<DeviceSearchResult | null> {
		// 检查缓存
		const cached = SmartResolver.searchCache.get(`kw:${keyword}`);
		if (cached) {
			console.log(`✅ [Resolver] Cache hit: ${keyword}`);
			return cached;
		}

		try {
			console.log(`🔍 [Resolver] Searching: ${keyword}`);

			// 调用 EDA API
			// @ts-expect-error eda 是全局对象
			const results = await eda.lib.Device.search(keyword, undefined, undefined, undefined, 10, 0);

			if (results && Array.isArray(results) && results.length > 0) {
				const device = results[0] as DeviceSearchResult;
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
