import type { ComponentIntent, ChainableHandle} from '../core/types';
import { FlowComponentHandle } from '../core/types';
import { SmartResolver } from '../resolver/SmartResolver';
import { Scheduler } from '../core/Scheduler';
import { PlaceTask } from '../core/PlaceTask';

/**
 * ComponentBuilder: 可链式调用的组件构建器
 * 
 * 核心特性：
 * 1. 实现 ChainableHandle 接口，支持链式调用
 * 2. 自动入队到 Scheduler，无需显式 commit()
 * 3. 立即返回包含 tempId 的 Handle
 * 
 * 使用方式：
 * ```typescript
 * // 创建元件（自动入队）
 * const R1 = Place.Resistor.value("10k").at(10, 10);
 * console.log(R1.tempId); // "temp_1" (立即可用)
 * 
 * // 手动提交批次
 * await commit();
 * console.log(R1.getRealId()); // "eda_xxx" (真实 ID)
 * ```
 */
export class ComponentBuilder implements ChainableHandle {
  private task: PlaceTask;
  private scheduler: Scheduler;
  
  // Handle 属性（立即可用）
  public readonly tempId: string;
  public readonly type: ComponentIntent['type'];
  public readonly ready: Promise<void>;
  private readyResolver!: () => void;

  constructor(type: ComponentIntent['type'], resolver?: SmartResolver) {
    this.scheduler = Scheduler.getInstance();
    this.tempId = this.scheduler.generateTempId();
    this.type = type;
    
    // 创建任务
    this.task = new PlaceTask(this.tempId, type, resolver ?? new SmartResolver());
    
    // 创建 ready Promise
    this.ready = new Promise<void>((resolve) => {
      this.readyResolver = resolve;
      // 向 Scheduler 注册这个 resolver
      this.scheduler.registerResolver(this.tempId, resolve);
    });

    /**
     * 关键设计：自动入队
     * 
     * 使用 queueMicrotask 确保：
     * 1. 当前同步的链式调用（.value().at().rot()）全部完成
     * 2. Task 的参数已经全部设置完毕
     * 3. 然后才入队到 Scheduler
     * 
     * 执行顺序：
     * - 同步：new ComponentBuilder() -> .value() -> .at() -> .rot()
     * - 微任务：enqueue(task) -> Scheduler.flush() -> 执行所有 Task
     */
    queueMicrotask(() => {
      this.scheduler.enqueue(this.task);
    });
  }

  // 获取意图数据（只读，反映当前链式调用设置的所有参数）
  public get intent(): Readonly<ComponentIntent> {
    return this.task.getIntent();
  }

  // 获取真实 EDA ID（批处理完成后可用）
  public getRealId(): string | undefined {
    return this.scheduler.getRealId(this.tempId);
  }

  // ==================== 链式接口 ====================
  // 每个方法返回 ChainableHandle，支持继续链式调用

  public lcsc(code: string): ChainableHandle {
    this.task.lcsc(code);
    return this;
  }

  public model(name: string): ChainableHandle {
    this.task.model(name);
    return this;
  }

  public value(v: string): ChainableHandle {
    this.task.value(v);
    return this;
  }

  public pkg(p: string): ChainableHandle {
    this.task.pkg(p);
    return this;
  }

  public at(x: number, y: number): ChainableHandle {
    this.task.at(x, y);
    return this;
  }

  public rot(angle: number): ChainableHandle {
    this.task.rot(angle);
    return this;
  }

  public prefer(s: string): ChainableHandle {
    this.task.prefer(s);
    return this;
  }
}
