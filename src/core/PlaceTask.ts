import type { ComponentIntent, ComponentSpec, PlaceCommand } from './types';
import type { SmartResolver } from '../resolver/SmartResolver';

// 简单的 UUID 生成
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// PlaceTask: 封装单个 Place 操作的任务
export class PlaceTask {
  private intent: ComponentIntent;
  private resolver: SmartResolver;
  private tempId: string;

  constructor(tempId: string, type: ComponentIntent['type'], resolver: SmartResolver) {
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

  // 执行任务：解析 + 构建 Command + 模拟调用 EDA API
  public execute(): void {
    // 1) Resolver 解析意图
    const spec: ComponentSpec = this.resolver.resolve(this.intent);

    // 2) 构建 PlaceCommand
    const command: PlaceCommand = {
      id: uuidv4(),
      action: 'place',
      component: spec,
      position: { x: this.intent.x ?? 0, y: this.intent.y ?? 0 },
      rotation: this.intent.rot ?? 0,
      metadata: {
        source: 'Flow-AutoCommit',
        rawValue: this.intent.value ?? '',
        tempId: this.tempId
      }
    };

    // 3) 模拟执行：发送到 EDA（实际中这里会调用真实 API）
    console.log(`📦 Executing Task [${this.tempId}]:`);
    console.log(JSON.stringify(command, null, 2));
  }
}
