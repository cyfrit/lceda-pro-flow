import { ComponentBuilder } from '../builder/ComponentBuilder';
import type { ChainableHandle } from '../core/types';
import { SmartResolver } from '../resolver/SmartResolver';

// Entry point: 导出 Place 对象
// 每次访问属性都返回一个新的 Builder（它会立即返回可链式的 Handle 并自动入队）
const sharedResolver = new SmartResolver();

export const Place = {
	get Resistor(): ChainableHandle {
		return new ComponentBuilder('Resistor', sharedResolver);
	},
	get Capacitor(): ChainableHandle {
		return new ComponentBuilder('Capacitor', sharedResolver);
	},
};
