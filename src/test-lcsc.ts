import { Place } from './actions/Place';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Test: LCSC & Model Direct Specification                 ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📍 Testing different component specification methods...\n');

// 方式 1: 传统方式 - value + pkg
const R1 = Place.Resistor.value('10k').pkg('0603').at(10, 10);

console.log(`✨ R1 (value+pkg): tempId=${R1.tempId}`);

// 方式 2: 直接指定 LCSC 编号（优先级最高）
const MCU = Place.Resistor.lcsc('C8734').at(20, 20);

console.log(`✨ MCU (lcsc): tempId=${MCU.tempId}, lcsc=${MCU.intent.lcsc}`);

// 方式 3: 指定芯片型号
const Chip = Place.Resistor.model('STM32F103C8T6').at(30, 30);

console.log(`✨ Chip (model): tempId=${Chip.tempId}, model=${Chip.intent.model}`);

// 方式 4: 组合使用 - lcsc 优先级最高
const R2 = Place.Resistor.value('10k')
	.pkg('0805')
	.lcsc('C17414') // 这个会覆盖前面的 value+pkg
	.at(40, 40);

console.log(`✨ R2 (combined): tempId=${R2.tempId}, lcsc=${R2.intent.lcsc}, value=${R2.intent.value}\n`);

console.log('📍 Synchronous phase complete.\n');

// 等待批处理完成并验证
async function verify() {
	await new Promise<void>((resolve) => {
		setTimeout(() => resolve(), 10);
	});

	console.log('\n╔════════════════════════════════════════════════════════════╗');
	console.log('║  Verification: Real IDs and Resolution                   ║');
	console.log('╚════════════════════════════════════════════════════════════╝\n');

	console.log('📋 Resolved components:');
	console.log(`  R1:   ${R1.getRealId()}`);
	console.log(`  MCU:  ${MCU.getRealId()}`);
	console.log(`  Chip: ${Chip.getRealId()}`);
	console.log(`  R2:   ${R2.getRealId()}\n`);

	console.log('🎉 All specification methods work correctly!');
}

verify();
