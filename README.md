# 114 工具箱 🍒

> 一个纯静态、零依赖、零构建的在线工具箱网站，域名 [114448.xyz](https://114448.xyz)。

**免费在线工具 · 数据本地处理不上传**。股票涨跌停板计算器、人民币大写转换、证件照尺寸对照表、半角全角转换、汉字简繁转换等 20 个工具，全程在浏览器本地运行，不产生任何数据上传，打开即用。

---

## ✨ 特性

- **纯静态 / 零依赖**：原生 HTML + CSS + JavaScript，无框架、无构建工具、无运行时依赖
- **隐私优先**：所有计算与处理均在本地完成，不发起业务数据请求（仅个别工具首次使用按需加载 CDN 组件，且带双 CDN 容错）
- **开箱即用**：克隆即可部署到任意静态托管，无需编译
- **响应式**：适配桌面与移动端，跟随系统明暗主题
- **内置 SEO**：`sitemap.xml`、`robots.txt`、JSON-LD 结构化数据一应俱全

---

## 🚀 在线使用

🌐 [https://114448.xyz](https://114448.xyz)

---

## 🧰 工具清单（20 个）

### 🧮 计算器类

| 工具 | 说明 |
|---|---|
| [科学计算器](scientific.html) | 四则运算 · 三角函数 · 对数 · 阶乘 · 括号，支持角度/弧度切换 |
| [房地产计算器](calc.html) | 亩数换算 · 建筑面积 · 楼面地价 · 容积率 |
| [股票涨跌停板计算器](limit.html) | 自动区分沪深北交所与 ST 股，计算涨停/跌停价 |
| [复利计算器](compound.html) | 知三求一，支持年/季/月/日复利 |
| [三角函数计算器](trig.html) | sin / cos / tan / cot / sec / csc，可设有效位数 |
| [圆要素转换器](circle.html) | 半径 / 直径 / 周长 / 面积，知一求三 |
| [退休年龄计算器](retirement.html) | 按 2025 延迟退休新规计算法定退休年龄与弹性区间 |
| [日期计算器](datecalc.html) | N 天前/后是几号，两日期相差多少天 |
| [证件照尺寸计算器](photosize.html) | 1–60 寸照片尺寸，含证件照规格速查 |

### 🎲 生成器类

| 工具 | 说明 |
|---|---|
| [随机密码生成器](password.html) | 高强度随机密码，自定义长度与字符类型，含熵值估算 |
| [二维码生成器](qr.html) | 文字/网址一键生成，可下载 PNG 或复制图片 |

### 📝 文本处理类

| 工具 | 说明 |
|---|---|
| [人民币大写转换工具](rmb.html) | 数字金额转中文大写，报销填单好帮手 |
| [汉字简繁转换工具](convert.html) | 简体 ↔ 繁体双向互转 |
| [半角转全角工具](halfwidth.html) | 去多余空格 · 英文标点转中文 · 去引用角标 |
| [Markdown 编辑器](markdown.html) | 左侧编辑、右侧实时预览（含工具栏与快捷键） |
| [文字一键排版工具](format.html) | 去乱码/角标/空行，智能整理脏文本 |

### 🧩 实用工具类

| 工具 | 说明 |
|---|---|
| [倒计时器](countdown.html) | 自定义时长，开始/暂停/重置 |
| [键盘按键检测工具](keyboard.html) | 按键实时显示，含 key / code / 键码 |
| [屏幕常亮工具](wakelock.html) | 阻止屏幕变暗与休眠（原生 Wake Lock） |
| [图片压缩工具](imgcomp.html) | 本地压缩 JPG/PNG/WebP，可调质量与尺寸，图片不上传 |

---

## 🛠️ 技术栈

- 原生 HTML5 + CSS3 + JavaScript（ES2015+）
- 无框架、无打包器，直接由浏览器加载
- 仅 3 个工具按需加载外部 CDN 组件（均为纯前端库，双 CDN 容错）：
  - 简繁转换 → `opencc-js`
  - Markdown 编辑 → `marked` + `DOMPurify`
  - 二维码 → `qrcode-generator`

---

## 📦 快速开始

无需安装依赖，任意静态服务器即可本地预览：

```bash
# 方式一：Python 内置服务器
python -m http.server 8000

# 方式二：Node 静态服务器（npx）
npx serve .
```

然后浏览器打开 <http://localhost:8000> 即可。

---

## 🚀 部署

纯静态站点，任选一种托管方式即可。

### GitHub Pages

1. 将仓库推送到 GitHub
2. `Settings → Pages`，Source 选择 `main` 分支根目录（或 `/docs`）
3. 如需自定义域名：在 `Settings → Pages → Custom domain` 填入 `114448.xyz`，并在 DNS 添加 CNAME 记录

### Cloudflare Pages / Netlify / Vercel

- 构建命令：**留空**（无需构建）
- 输出目录：**仓库根目录**（`/`）

### 其他（Nginx / OSS / 对象存储）

直接把整个目录上传即可，无任何后端要求。

> ⚠️ 提示：`sitemap.xml` 中站点地址默认写的是 `https://114448.xyz`，若最终域名或协议（http/https、是否加 www）有变化，请同步修改 `sitemap.xml` 与 `robots.txt`。

---

## 📁 目录结构

```
xtools/
├── index.html            # 首页（工具导航）
├── *.html                # 20 个工具页面
├── sitemap.xml           # 站点地图（SEO）
├── robots.txt            # 爬虫规则
├── assets/
│   ├── css/
│   │   └── style.css     # 全站统一样式
│   ├── js/
│   │   ├── ui.js         # 共享：Logo 注入 / Toast / 复制 / 相关工具 / 搜索
│   │   └── *.js          # 各工具脚本（纯函数可单测）
│   └── logo/
│       └── logo.svg      # 站点 Logo 源文件
```

**代码约定**：每个工具的 JS 分为「纯函数」（可在 Node 中直接测试）与「DOM 交互」（浏览器环境）两部分，通过 `typeof module !== 'undefined'` 与 `typeof document !== 'undefined'` 隔离，便于单测与复用。

---

## 🌐 浏览器兼容性

| 能力 | 最低版本 |
|---|---|
| Wake Lock（屏幕常亮工具） | Chrome 84+ / Edge 84+ / Safari 16.4+ |
| Clipboard API（复制） | 现代浏览器（含降级方案） |
| 其余全部工具 | 任意支持 ES2015+ 的浏览器 |

---

## ✅ 质量与测试

每个工具的纯函数都可在 Node 中独立测试：

```bash
node --check assets/js/*.js                                   # 语法检查
node -e "require('./assets/js/rmb.js').rmbToChinese(1234.56)"  # 单测示例
```

关键算法（人民币大写、科学计算器表达式、涨跌停、退休年龄、日期计算、三角函数、图片压缩等）均有针对边界情况的测试覆盖。

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源，代码可自由使用、修改与部署。

---

## ⚠️ 免责声明

站内股票涨跌停、退休年龄、复利、房地产等计算结果仅供参考，不构成投资建议或政策依据；请以官方发布为准。

---

*数据不出门，工具在手，天下我有 🍒*
