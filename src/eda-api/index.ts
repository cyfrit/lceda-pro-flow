/**
 * EDA API 封装
 *
 * 统一导出所有 EDA API 相关模块，提供清晰的调用入口
 *
 * @module eda-api
 */

// 类型导出
export * from './types';

// 库 API - 器件、符号、封装搜索
export * from './library';

// 原理图 API - 元件放置、导线连接
export * from './schematic';

// 未来可扩展：
// - pcb.ts - PCB 布局、走线、覆铜
// - system.ts - 对话框、日志、设置
// - utils.ts - 工具函数
