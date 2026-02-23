/**
 * 入口文件
 *
 * 本文件为默认扩展入口文件
 */
import * as extensionConfig from '../extension.json';

// ==================== Flow DSL Imports ====================
import { Place } from './actions/Place';
import { commit } from './core/commit';

// ==================== 插件生命周期 ====================
/**
 * 插件激活时自动调用
 * 将 Flow DSL API 挂载到全局作用域，让用户可以直接使用
 */
export function activate(status?: 'onStartupFinished', arg?: string): void {
	// 输出 FLOW 艺术字
	console.log(`
 ███████████ █████          ███████    █████   ███   █████
▒▒███▒▒▒▒▒▒█▒▒███         ███▒▒▒▒▒███ ▒▒███   ▒███  ▒▒███ 
 ▒███   █ ▒  ▒███        ███     ▒▒███ ▒███   ▒███   ▒███ 
 ▒███████    ▒███       ▒███      ▒███ ▒███   ▒███   ▒███ 
 ▒███▒▒▒█    ▒███       ▒███      ▒███ ▒▒███  █████  ███  
 ▒███  ▒     ▒███      █▒▒███     ███   ▒▒▒█████▒█████▒   
 █████       ███████████ ▒▒▒███████▒      ▒▒███ ▒▒███     
▒▒▒▒▒       ▒▒▒▒▒▒▒▒▒▒▒    ▒▒▒▒▒▒▒         ▒▒▒   ▒▒▒      
	`);
	console.log(`🚀 Flow DSL v${extensionConfig.version} - PCB as Code`);
	console.log('');

	// 挂载到全局 window 对象
	// 用户可以直接写：Place.Resistor.lcsc('C17414').at(0, 0);
	if (typeof window !== 'undefined') {
		(window as any).Place = Place;
		(window as any).commit = commit;

		console.log('✅ 全局 API 已就绪');
		console.log('💡 快速开始:');
		console.log('   Place.Resistor.lcsc("C17414").at(0, 0);');
		console.log('   await commit();');
		console.log('');
	} else {
		console.warn('⚠️  非浏览器环境，无法挂载全局对象');
	}
}

// ==================== 菜单命令 ====================
export function about(): void {
	eda.sys_Dialog.showInformationMessage(
		`Flow DSL v${extensionConfig.version}\n\nPCB as Code - 用代码描述电路\n\n使用示例:\nPlace.Resistor.lcsc("C17414").at(0, 0);\nawait commit();`,
		'关于 Flow DSL',
	);
}
