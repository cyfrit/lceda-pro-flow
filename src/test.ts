import { Place } from './actions/Place';
import { commit } from './core/commit';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Flow Manual Commit Demo                                  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📍 [Batch 1] Creating first batch of components...\n');

// ==================== 同步代码块 ====================
// 这些代码会立即执行，创建 Handle 并入队 Task

const R1 = Place.Resistor.value('10k').pkg('0603').at(10, 10).rot(90);

console.log(`✨ R1 Handle created: tempId=${R1.tempId}, type=${R1.type}`);
const C1 = Place.Capacitor.value('100nF').pkg('0402').at(20, 20);

console.log(`✨ C1 Handle created: tempId=${C1.tempId}, type=${C1.type}`);

const R2 = Place.Resistor.value('1k').pkg('0603').at(30, 30);

console.log(`✨ R2 Handle created: tempId=${R2.tempId}, type=${R2.type}\n`);

// ==================== 手动提交第一批 ====================
console.log('💾 Manual commit() - Executing first batch...\n');

async function runDemo() {
	// 手动提交，立即执行上面的 3 个任务
	await commit();

	console.log('\n✅ Batch 1 committed! Real IDs are now available:\n');
	console.log(`  R1: ${R1.getRealId()}`);
	console.log(`  C1: ${C1.getRealId()}`);
	console.log(`  R2: ${R2.getRealId()}\n`);

	// ==================== 第二批 ====================
	console.log('📍 [Batch 2] Creating second batch with LCSC/Model...\n');

	const MCU = Place.Resistor.lcsc('C8734').at(40, 40);

	console.log(`✨ MCU Handle created: tempId=${MCU.tempId} (using LCSC: C8734)`);

	const MCU2 = Place.Resistor.model('STM32F103C8T6').at(50, 50);

	console.log(`✨ MCU2 Handle created: tempId=${MCU2.tempId} (using model: STM32F103C8T6)\n`);

	// 提交第二批
	console.log('💾 Manual commit() - Executing second batch...\n');
	await commit();

	console.log('\n✅ Batch 2 committed! Real IDs:\n');
	console.log(`  MCU: ${MCU.getRealId()}`);
	console.log(`  MCU2: ${MCU2.getRealId()}\n`);

	// ==================== 测试自动批处理 ====================
	console.log('📍 [Batch 3] Testing auto-commit (without manual commit())...\n');

	const R3 = Place.Resistor.value('100k').pkg('0805').at(60, 60);
	console.log(`✨ R3 Handle created: tempId=${R3.tempId}`);
	console.log('   → This will auto-execute when script ends\n');

	console.log('📍 Script End - R3 will auto-commit in microtask phase.\n');

	// 等待自动批处理完成
	await new Promise<void>((resolve) => {
		setTimeout(() => resolve(), 10);
	});

	console.log('✅ Auto-commit completed! R3 Real ID:', R3.getRealId());

	console.log('\n╔════════════════════════════════════════════════════════════╗');
	console.log('║  Summary                                                  ║');
	console.log('╠════════════════════════════════════════════════════════════╣');
	console.log('║  ✅ Manual commit(): R1, C1, R2 (Batch 1)                 ║');
	console.log('║  ✅ Manual commit(): MCU, MCU2 (Batch 2)                  ║');
	console.log('║  ✅ Auto commit: R3 (Batch 3)                             ║');
	console.log('║                                                           ║');
	console.log('║  Key takeaway:                                            ║');
	console.log('║  - Use commit() to control execution timing               ║');
	console.log('║  - Without commit(), tasks auto-execute at script end     ║');
	console.log('╚════════════════════════════════════════════════════════════╝');
}

runDemo();
