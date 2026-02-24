import type { ComponentIntent, ComponentSpec, ComponentType } from '../core/types';

// SmartResolver: 将用户的模糊意图解析为具体的 ComponentSpec
// 这个实现使用一个简单的 MOCK_DATABASE 来演示解析流程。
export class SmartResolver {
	// Mock 数据库: key -> ComponentSpec
	private static MOCK_DATABASE: Record<string, Partial<ComponentSpec>> = {
		// Resistors
		'Resistor:10k:0603': { lcsc: 'C17414', package: '0603', footprint: 'R_0603' },
		'Resistor:1k:0603': { lcsc: 'C17413', package: '0603', footprint: 'R_0603' },
		'Resistor:10k:0805': { lcsc: 'C20001', package: '0805', footprint: 'R_0805' },
		// Capacitors
		'Capacitor:1uF:0603': { lcsc: 'C28001', package: '0603', footprint: 'C_0603' },
		'Capacitor:100nF:0603': { lcsc: 'C28002', package: '0603', footprint: 'C_0603' },
	};

	// LCSC 直接查询数据库（模拟）
	private static LCSC_DATABASE: Record<string, Partial<ComponentSpec>> = {
		'C8734': {
			lcsc: 'C8734',
			package: 'LQFP-48',
			footprint: 'LQFP-48_7x7x05P',
			manufacturer: 'STMicroelectronics',
			value: 'STM32F103C8T6',
		},
		'C17414': { lcsc: 'C17414', package: '0603', footprint: 'R_0603', value: '10k' },
		'C17413': { lcsc: 'C17413', package: '0603', footprint: 'R_0603', value: '1k' },
		'C28001': { lcsc: 'C28001', package: '0603', footprint: 'C_0603', value: '1uF' },
	};

	// 芯片型号数据库（模拟）
	private static MODEL_DATABASE: Record<string, string> = {
		'STM32F103C8T6': 'C8734',
		'ATmega328P': 'C9998',
		'ESP32-WROOM-32': 'C82899',
	};

	/**
	 * resolve: 将 ComponentIntent 转为 ComponentSpec
	 *
	 * 解析优先级：
	 * 1. 直接指定 LCSC 编号（intent.lcsc）- 优先级最高
	 * 2. 芯片型号（intent.model）- 查询型号数据库
	 * 3. 语义查询（type + value + pkg）- 模糊匹配
	 * 4. Generic fallback - 返回通用规格
	 */
	// eslint-disable-next-line complexity
	public resolve(intent: ComponentIntent): ComponentSpec {
		const type: ComponentType = intent.type;

		// 优先级 1: 直接指定 LCSC 编号
		if (intent.lcsc) {
			const found = SmartResolver.LCSC_DATABASE[intent.lcsc];
			if (found) {
				const result: ComponentSpec = {
					type,
					value: intent.value || found.value,
					lcsc: found.lcsc,
					package: found.package ?? 'UNKNOWN',
					footprint: found.footprint ?? 'UNKNOWN',
					manufacturer: found.manufacturer,
					prefer: intent.prefer,
				};
				return result;
			}
			// LCSC 编号未找到，返回用户指定的编号（可能是新料号）
			const result: ComponentSpec = {
				type,
				value: intent.value || intent.model,
				lcsc: intent.lcsc,
				package: intent.pkg || 'UNKNOWN',
				footprint: intent.pkg ? `${type[0]}_${intent.pkg}` : 'UNKNOWN',
				prefer: intent.prefer,
			};
			return result;
		}

		// 优先级 2: 芯片型号查询
		if (intent.model) {
			const lcscCode = SmartResolver.MODEL_DATABASE[intent.model];
			if (lcscCode) {
				const found = SmartResolver.LCSC_DATABASE[lcscCode];
				if (found) {
					const result: ComponentSpec = {
						type,
						value: intent.model,
						lcsc: found.lcsc,
						package: found.package ?? 'UNKNOWN',
						footprint: found.footprint ?? 'UNKNOWN',
						manufacturer: found.manufacturer,
						prefer: intent.prefer,
					};
					return result;
				}
			}
			// 型号未找到，返回 Generic
			const result: ComponentSpec = {
				type,
				value: intent.model,
				lcsc: 'UNKNOWN',
				package: intent.pkg || 'UNKNOWN',
				footprint: intent.pkg ? `${type[0]}_${intent.pkg}` : 'UNKNOWN',
				manufacturer: 'UNKNOWN',
				prefer: intent.prefer,
			};
			return result;
		}

		// 优先级 3: 语义查询（原有逻辑）
		const value = intent.value ? intent.value : 'GENERIC';
		const pkg = intent.pkg ? intent.pkg : '0805';

		const keyAttempts = [`${type}:${value}:${pkg}`, `${type}:${value}:GENERIC`, `${type}:GENERIC:${pkg}`, `${type}:GENERIC:GENERIC`];

		for (const key of keyAttempts) {
			const found = SmartResolver.MOCK_DATABASE[key];
			if (found) {
				const result: ComponentSpec = {
					type,
					value: intent.value,
					lcsc: found.lcsc,
					package: found.package ?? pkg,
					footprint: found.footprint ?? `${type[0]}_${pkg}`,
					manufacturer: found.manufacturer,
					prefer: intent.prefer,
				};
				return result;
			}
		}

		// 优先级 4: Generic fallback
		const result: ComponentSpec = {
			type,
			value: intent.value,
			lcsc: 'GENERIC',
			package: pkg,
			footprint: `${type[0]}_${pkg}`,
			manufacturer: 'GENERIC',
			prefer: intent.prefer,
		};
		return result;
	}
}
