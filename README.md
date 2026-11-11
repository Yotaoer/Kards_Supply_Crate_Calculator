# Kards- 军需箱（骨灰盒）计算器  

> 当前分支 `rewrite/kards-supply-planner` 是新版源码。`main` 和现有 GitHub Pages 仍保留旧站，新版尚未配置上线。

## 旧版说明

刚开始制作的时候是有输入卡片数量来计算获得重复卡牌概率的功能的  
但是额呃呃呃  
首先手动输入各类型卡牌数量太过麻烦  
冰岛人的用户数据也找不到wwwww  
所以功能写好之后又把它砍了hhh  
毕竟那点概率对游戏本身其实影响不大  
有什么好的建议可以加qq群861577417或者好友3577557518  
已经通过Github Pages部署https://yotaoer.github.io/Kards_Supply_Crate_Calculator/

## 重写版（未上线）

新版为 Vite + TypeScript + 原生 DOM，提交在独立重写分支。推送此分支不修改 `main`、默认分支或 Pages 设置，也不代表新版已部署。

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

新版未来需要先执行 `npm ci`、`npm run build`，再发布生成的 `dist/`。当前 Pages 仍是 `main:/` 的旧单HTML入口，不能把本分支Vite源码直接作为已上线静态站使用。部署方式尚未配置。

素材来源及授权边界见 `docs/sources.md`。游戏现行概率与完整社区素材许可尚未核实，仓库未添加统一代码或素材授权许可。
