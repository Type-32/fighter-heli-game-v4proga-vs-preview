# 战斗直升机模拟器 (Combat Helicopter Simulator)

一个基于 [Three.js](https://threejs.org/) 的浏览器 3D 战斗直升机模拟器。驾驶一架 AH-64 阿帕奇风格的武装直升机，摧毁三波敌方装甲单位。

## 功能特性

- 程序化建模的攻击直升机（座舱、旋翼、尾桨、火箭巢、导弹、机炮、飞行员）
- 简化气动模型：总距升力、旋翼转速迟滞、地面效应、俯仰/横滚/偏航、硬着陆损伤
- 武器系统：机炮（曳光弹）、火箭弹、热寻的导弹（需锁定目标）
- 敌方单位：坦克、装甲车、卡车，共 3 波，会瞄准玩家开火
- 程序化地形：山脉、湖泊、雪线、树木、岩石、起降坪
- 特效：爆炸、烟雾、火光、碎片、尘土、曳光弹
- WebAudio 合成的引擎 / 旋翼 / 武器音效
- HUD：速度、高度、航向、总距、转速、机身状态、弹药、目标锁定框

## 环境要求

- 现代浏览器（Chrome / Edge / Firefox，推荐 Chrome）
- 任意静态文件服务器（Python、Node.js、VS Code Live Server 等）
- 需要联网（Three.js 通过 unpkg CDN 加载）

## 运行方式

项目是纯前端项目，使用 ES Modules 和 import map 加载 Three.js，必须通过 HTTP 服务器访问（直接双击打开 `index.html` 会因 CORS 限制无法加载模块）。

### 方式一：Python（推荐）

```bash
cd "Documents/WebStorm Projects/dsv4test"
python3 -m http.server 8000
```

然后浏览器打开 <http://localhost:8000>

### 方式二：Node.js

```bash
npx serve .
```

### 方式三：WebStorm

在 WebStorm 中打开项目，右键 `index.html`，选择 **Run 'index.html'**（WebStorm 会自动启动内置服务器并打开浏览器）。

## 操作说明

| 按键 | 功能 |
| --- | --- |
| W / S | 俯仰 —— 机头下压前进 / 拉起后退 |
| A / D | 横滚 —— 左右侧移 |
| Q / E | 偏航 —— 左右转向 |
| Shift / 空格 | 总距杆上提 —— 上升 |
| X | 总距杆下压 —— 下降 |
| 鼠标左键 | 机炮射击（沿准星方向） |
| F | 火箭弹（沿瞄准方向） |
| 鼠标右键 | 锁定目标并发射导弹 |
| C | 座舱 / 外部视角切换 |
| M | 静音 |
| R | 重新开始 |

## 游戏目标

摧毁全部三波敌方装甲单位即可获胜。敌方坦克与装甲车会向玩家开火，机身受损会冒烟，机头方向即前进方向——控制好总距与姿态。

## 项目结构

```
dsv4test/
├── index.html          # 入口页面（含 HUD 与界面样式）
└── src/
    ├── main.js         # 主程序：场景、游戏循环、相机、战斗逻辑
    ├── helicopter.js   # 直升机建模与气动物理
    ├── terrain.js      # 程序化地形、水面、树木、岩石
    ├── enemies.js      # 敌方单位与 AI 火力
    ├── weapons.js      # 机炮 / 火箭 / 导弹弹道
    ├── effects.js      # 粒子特效（爆炸、烟雾、火光、碎片）
    ├── audio.js        # WebAudio 合成音效
    ├── hud.js          # HUD 与瞄准界面
    ├── input.js        # 键鼠输入
    └── util.js         # 工具函数（随机数、数值钳制）
```
