# Flow DSL - Auto-Commit Architecture

## 🎯 核心改进

移除了冗余的 `.commit()` 调用，采用 **自动提交 (Auto-Commit)** 模式，基于 JavaScript Event Loop 的异步批处理机制。

## 📐 架构设计

### 1. **Scheduler (调度器)** - 单例模式
- 全局单例，维护任务队列
- 使用 `queueMicrotask` 实现延迟批量执行
- 自动收集同一 tick 内的所有操作
- 维护 `tempId -> realEdaId` 映射

### 2. **Event Loop 机制** - 执行顺序保证

```
┌─────────────────────────────────────────────────────────────┐
│  JavaScript Event Loop                                       │
├─────────────────────────────────────────────────────────────┤
│  1. 同步代码执行（Call Stack）                               │
│     - Place.Resistor.value('10k')  // 创建 Task，入队       │
│     - Place.Capacitor.value('1uF') // 创建 Task，入队       │
│     - console.log('Script End')    // 同步日志              │
│                                                              │
│  2. 调用栈清空 ✅                                            │
│                                                              │
│  3. 执行 Microtask Queue（微任务队列）                       │
│     - queueMicrotask(() => this.flush())  // 这里！         │
│     - 批量解析所有 Task（Resolver）                          │
│     - 批量生成 Command JSON                                  │
│     - 批量调用 EDA API (eda.applyCommand)                   │
│                                                              │
│  4. 执行 Macrotask Queue（宏任务：setTimeout, I/O...）      │
└─────────────────────────────────────────────────────────────┘
```

### 3. **Stable Handles (稳定句柄)**
- 立即返回包含 `tempId` 的 Handle
- 可在 EDA ID 生成前被后续操作引用
- 提供 `ready` Promise 等待批处理完成
- 提供 `getRealId()` 获取真实 EDA ID

### 4. **PromiseLike 支持** - await 语法
- ComponentBuilder 实现 `PromiseLike<FlowComponentHandle>`
- 支持 `await Place.Resistor.value("10k")` 语法
- await 会等待批处理完成并返回完整的 Handle

## 🚀 使用示例

### 方式 1: 自动提交（推荐）
```typescript
const R1 = Place.Resistor.value("10k").at(10, 10);
const C1 = Place.Capacitor.value("1uF").at(20, 20);

console.log(R1.tempId);  // "temp_1" (立即可用)

// 三个元件会在同一个 microtask 中批量执行
```

### 方式 2: await 等待完成
```typescript
// 等待批处理完成并获取真实 ID
const R2 = await Place.Resistor.value("1k").at(30, 30);

console.log(R2.tempId);     // "temp_2"
console.log(R2.getRealId()); // "eda_xxx" (真实 ID)
```

### 方式 3: 引用前面创建的元件
```typescript
// 所有 Handle 立即可用，可以在批处理前互相引用
const R1 = Place.Resistor.value("10k").at(10, 10);
const R2 = Place.Resistor.value("1k").at(20, 20);

// 未来可以这样连接（Connect 功能待实现）
// const net = Connect.pins(R1, R2).name("VCC");
```

## 📊 执行顺序验证

运行 `pnpm run flow:test` 可以看到清晰的执行顺序：

```
╔════════════════════════════════════════════════════════════╗
║  Execution Order Summary                                  ║
╠════════════════════════════════════════════════════════════╣
║  1. [Sync]      Create R1, C1, R2 handles                 ║
║  2. [Sync]      Log "Script End"                          ║
║  3. [Microtask] Scheduler flushes all 3 tasks             ║
║  4. [Macrotask] Verification phase (setTimeout)           ║
║  5. [Await]     Create R3 and wait for completion         ║
╚════════════════════════════════════════════════════════════╝
```

关键观察：
- ✅ "Script End" 日志先于 Scheduler 执行
- ✅ 同步创建的 3 个元件在一次批处理中执行
- ✅ await 语法正确等待批处理完成

## 📁 目录结构

```
src/
├── core/                      # 核心机制
│   ├── types.ts              # 类型定义（含详细 JSDoc）
│   ├── Scheduler.ts          # 调度器（含 Event Loop 注释）
│   ├── PlaceTask.ts          # 任务封装
│   └── index.ts
├── resolver/                  # 意图解析
│   ├── SmartResolver.ts      # LCSC 数据库查询
│   └── index.ts
├── builder/                   # 链式构建
│   ├── ComponentBuilder.ts   # 实现 ChainableHandle & PromiseLike
│   └── index.ts
├── actions/                   # DSL API
│   ├── Place.ts              # Place.Resistor / Capacitor
│   └── index.ts              # 可扩展: Connect, Route...
├── index.ts                   # 统一导出 + 全局挂载
└── test.ts                    # Event Loop 演示
```

## 🔑 关键类型

```typescript
// 基础 Handle - 包含元件信息与状态
interface FlowComponentHandle {
  tempId: string;              // 临时 ID（立即可用）
  type: ComponentType;
  intent: Readonly<ComponentIntent>;
  ready: Promise<void>;        // 等待批处理完成
  getRealId: () => string | undefined;
}

// 可链式调用的 Handle
interface ChainableHandle extends FlowComponentHandle {
  value(v: string): ChainableHandle;
  pkg(p: string): ChainableHandle;
  at(x: number, y: number): ChainableHandle;
  rot(angle: number): ChainableHandle;
  prefer(s: string): ChainableHandle;
}

// ComponentBuilder 实现
class ComponentBuilder implements 
  ChainableHandle, 
  PromiseLike<FlowComponentHandle> {
  // ... 支持链式调用和 await 语法
}
```

## 🎪 运行测试

```bash
pnpm run flow:test
```

输出展示完整的 Event Loop 执行流程，包括：
- 同步创建 Handle
- Microtask 批量执行
- await 语法验证
- 真实 ID 映射

## 🌐 全局访问

库会自动挂载到全局对象：

```typescript
// 在浏览器控制台或 Node.js REPL 中
Flow.Place.Resistor.value("10k").at(10, 10);
```

## 🔮 未来扩展

基于这个架构，可以轻松添加：

```typescript
// Connect (连接引脚)
const net = Connect.pins(R1, C1).name("VCC");

// Route (走线)
const trace = Route.from(R1).to(C1).width(0.2);

// Net (网络定义)
const gnd = Net.create("GND").connect(R1, R2, C1);
```

所有操作都遵循相同的 Auto-Commit 模式，支持链式调用和 await 语法。

## ⚙️ 核心设计原则

1. **类型安全**：严禁 `any`，所有接口都有明确定义
2. **Event Loop 友好**：利用 microtask 保证批处理时机
3. **立即可用**：Handle 包含 tempId，无需等待即可引用
4. **AI Friendly**：清晰的数据结构，方便 AI 生成复杂代码
5. **可扩展**：模块化设计，新增 Action 只需添加文件夹
