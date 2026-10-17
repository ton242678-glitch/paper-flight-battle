# 纸飞机大战 · Paper Flight Battle

[![Static checks](https://github.com/ton242678-glitch/paper-flight-battle/actions/workflows/static-checks.yml/badge.svg)](https://github.com/ton242678-glitch/paper-flight-battle/actions/workflows/static-checks.yml)

用 **原生 JavaScript、Canvas 和 Web Audio** 实现的纸面风格射击小游戏。通过一个完整交互场景练习游戏循环、碰撞检测、状态管理和浏览器音效。

### [▶ 在线试玩](https://ton242678-glitch.github.io/paper-flight-battle/)

## 玩法与功能

- **关卡模式**：5 个关卡，包含敌机、Boss 和阶段变化。
- **无尽模式**：在持续出现的敌人与 Boss 中累计分数。
- **控制面板**：开始、暂停、模式切换、声音开关和解锁后的选关。
- **操作反馈**：分数、生命、剩余时间、弹幕、粒子与程序生成音效。
- **本地记录**：浏览器保存选关解锁状态。

| 操作 | 作用 |
| --- | --- |
| 点击“开始” | 启动或重新开始游戏 |
| 在画布上移动鼠标，或按住后拖动 | 控制纸飞机目标位置，游戏中自动射击 |
| 点击“暂停” | 暂停 / 继续 |
| 点击“模式” | 切换关卡模式与无尽模式 |
| 点击“声音” | 打开 / 关闭音效 |

选关入口包含本地调试解锁逻辑，不连接账号系统。操作事件使用 Pointer Events；移动端的完整布局与玩法体验仍适合继续验证。

## 本地运行

项目只有静态文件，无需安装前端依赖：

```bash
git clone https://github.com/ton242678-glitch/paper-flight-battle.git
cd paper-flight-battle
python -m http.server 4175 --bind 127.0.0.1
# 浏览器打开 http://127.0.0.1:4175
```

## 代码入口

| 文件 | 负责的内容 |
| --- | --- |
| `index.html` | Canvas、计分区和游戏控制按钮 |
| `styles.css` | 纸面视觉、布局与交互控件 |
| `game.js` | 状态切换、动画循环、敌机与 Boss、碰撞、音效和输入 |

```mermaid
flowchart LR
    A[鼠标 / 触控输入] --> B[状态与位置更新]
    B --> C[敌机、Boss 与碰撞]
    C --> D[分数、生命和阶段]
    D --> E[Canvas 绘制与音效]
    E --> B
```

## 验证与后续改进

GitHub Pages 提供在线入口，新增 CI 检查 `game.js` 的语法。语法检查不等同于完整通关测试。

后续可以记录各关卡的试玩过程，补充关键场景截图、移动端体验和碰撞边界测试。

## 许可状态

仓库当前尚未设置独立的开源许可证。
