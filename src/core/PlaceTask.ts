import type { SmartResolver } from '../resolver/SmartResolver';
import type { ComponentIntent, ComponentSpec } from './types';
import { placeComponent } from '../eda-api/schematic';

// PlaceTask: 封装单个 Place 操作的任务
export class PlaceTask {
	private intent: ComponentIntent;
	private resolver: SmartResolver;
	private tempId: string;

	public constructor(tempId: string, type: ComponentIntent['type'], resolver: SmartResolver) {
		this.tempId = tempId;
		this.intent = { type };
		this.resolver = resolver;
	}

	// 链式设置方法（修改 intent）
	public lcsc(code: string): this {
		this.intent.lcsc = code;
		return this;
	}

	public model(name: string): this {
		this.intent.model = name;
		return this;
	}

	public value(v: string): this {
		this.intent.value = v;
		return this;
	}

	public pkg(p: string): this {
		this.intent.pkg = p;
		return this;
	}

	public at(x: number, y: number): this {
		this.intent.x = x;
		this.intent.y = y;
		return this;
	}

	public rot(angle: number): this {
		this.intent.rot = angle;
		return this;
	}

	public prefer(s: string): this {
		this.intent.prefer = s;
		return this;
	}

	public getTempId(): string {
		return this.tempId;
	}

	public getIntent(): ComponentIntent {
		return this.intent;
	}

	/**
	 * 执行任务：解析 + 调用 EDA API 放置元件
	 *
	 * 执行流程：
	 * 1. Resolver 异步解析意图 → ComponentSpec（包含 EDA 需要的 uuid, libraryUuid 等）
	 * 2. 调用 placeComponent() 放置元件到原理图
	 * 3. 返回真实 EDA 图元 ID
	 */
	public async execute(): Promise<string | undefined> {
		try {
			// 1) Resolver 异步解析意图
			const spec: ComponentSpec = await this.resolver.resolve(this.intent);

			console.log(`📦 Executing Task [${this.tempId}]:`);
			console.log(`   Type: ${spec.type}`);
			console.log(`   LCSC: ${spec.lcsc || 'N/A'}`);
			console.log(`   Name: ${spec.value || spec.lcsc}`);
			console.log(`   Footprint: ${spec.footprint}`);
			console.log(`   Position: (${this.intent.x ?? 0}, ${this.intent.y ?? 0})`);
			console.log(`   Rotation: ${this.intent.rot ?? 0}°`);

			// 2) 检查是否有必需的 EDA 字段
			if (!spec.uuid || !spec.libraryUuid) {
				console.warn(`⚠️ [${this.tempId}] Missing EDA fields (uuid/libraryUuid), skipping placement`);
				return undefined;
			}

			// 3) 调用 EDA API 放置元件
			const primitive = await placeComponent(
				{
					uuid: spec.uuid,
					libraryUuid: spec.libraryUuid,
				},
				this.intent.x ?? 0,
				this.intent.y ?? 0,
				{
					rotation: this.intent.rot ?? 0,
					mirror: false,
					addIntoBom: true,
					addIntoPcb: true,
				},
			);

			if (primitive) {
				console.log(`✅ Placed: ${spec.value || spec.lcsc} → ID: ${primitive.id}`);
				return primitive.id;
			} else {
				console.warn(`⚠️ Failed to place component [${this.tempId}]`);
				return undefined;
			}
		} catch (error) {
			console.error(`❌ Task [${this.tempId}] execution failed:`, error);
			throw error;
		}
	}
}
