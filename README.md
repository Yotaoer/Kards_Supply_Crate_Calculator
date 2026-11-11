# Kards- 军需箱（骨灰盒）计算器  

新版为 Vite + TypeScript + 原生 DOM，重写内容已合并到 `main`。开发源码需要构建后发布，不能直接把 `src/main.ts` 当作浏览器生产入口。

```sh
npm ci
npm run dev -- --port 5173
npm test
npm run build
npm run check:browser
node scripts/check-additions.mjs
```

Node 22.18+ 可直接运行 TypeScript 纯计算测试，无测试框架依赖。开发验证使用 Node 24；浏览器脚本使用 Windows 上已安装的 Edge/Chrome，不自动下载浏览器。`check:browser` 支持 `BROWSER_PATH`，`BASE_URL` 默认 `http://127.0.0.1:5173`；新增功能及截图脚本默认使用本机 Edge 和该地址。先构建并启动开发服务，再执行浏览器检查。

自动推荐仅优化两种包，金币预算和已有包是硬约束；手动草稿独立保留。全卡系数是旧表期望口径，非保底，规则依据和待核问题见 `docs/mechanics.md`。构建 `base: './'`，兼容仓库子路径。

结算单另行计算最低达标新购金币和金币缺口，不用预算内方案花费冒充达标费用。本地预览禁用访问统计；生产环境只展示本页PV，失败或超时不影响计算。

## GitHub Pages

`.github/workflows/pages.yml` 在 `main` 推送或手动触发时使用 Node 24 执行 `npm ci`、`npm test`、`npm run build`，只上传并部署 `dist/`。Windows浏览器检查仍在本地运行，不放入Ubuntu构建任务。

仓库 Pages 发布来源需设为 **GitHub Actions**，不再直接发布 `main:/` 的源码目录。网站地址保持 `https://yotaoer.github.io/Kards_Supply_Crate_Calculator/`，Vite的相对 `base: './'` 支持该仓库子路径。

实际部署是否成功以 Actions 和 Pages 状态为准；提交工作流不等于已上线。

素材来源及授权边界见 `docs/sources.md`。游戏现行概率与完整社区素材许可尚未核实，仓库未添加统一代码或素材授权许可。
