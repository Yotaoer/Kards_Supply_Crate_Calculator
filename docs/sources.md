# 来源与素材

- 业务基线：`https://github.com/Yotaoer/Kards_Supply_Crate_Calculator`，真实 Git 克隆，源提交 `6a866e08929fee7dc427a016f383455cd7dc0777`。规则证据见 `mechanics.md`。
- Geist：`@fontsource-variable/geist@5.3.0`，来源 `https://fontsource.org/fonts/geist`；字体作者 The Geist Project Authors，项目 `https://github.com/vercel/geist-font`，SIL Open Font License 1.1。字体经依赖本地打包，无在线字体服务；完整许可原样复制到 `public/licenses/geist-OFL.txt`，随静态构建分发。
- 工具图标：`lucide@0.468.0`，`https://lucide.dev/`；依赖中的完整许可原样复制到 `public/licenses/lucide-LICENSE.txt`，不宣称图标为 KARDS 官方资产。
- Android封装：`@capacitor/core@8.6.0`、`@capacitor/android@8.6.0`，`https://capacitorjs.com/`；各自现成MIT许可保留在 `public/licenses/capacitor-core-MIT.txt`、`capacitor-android-MIT.txt`，随离线APK内置，不作为本项目统一授权。
- Oswald：`@fontsource-variable/oswald`，`https://fontsource.org/fonts/oswald`，SIL Open Font License 1.1；完整依赖许可位于 `public/licenses/oswald-OFL.txt`。
- 运行时KARDS素材来自官方站：`public/assets/kards/logo.svg` 原始地址 `https://www.kards.com/static/images/logo.svg`；`desk.jpg` 原始地址 `https://www.kards.com/static/images/bg.jpg`；`paper.png` 原始地址 `https://www.kards.com/static/images/paper2.png`。文件按官方资产本地化，仅用于当前美术样板，不宣称自行创作或官方授权背书。
- 官方资源页 `https://www.kards.com/resources` 提供Press Kit及社区许可入口；社区许可链接 `https://support.kards.com/hc/en-us/articles/360027838532-KARDS-Community-License` 在核查时跳转帮助首页，完整条款尚未核实。源分支推送不等于素材已获得公开部署授权；素材权利归各自权利人。
- 当前页面不呈现对局截图、实机截图或其裁切，也没有真实普通包/军官包位图；两类补给仅用工具图标和印刷层级区分，不冒充官方包外观。
- 测试中的金币、库存和计数均为人工测试夹具，不是用户个人资产；默认资产为0。本地截图和执行流水不随此分支提交。
- 访问统计复用 `https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js`，仅展示本页PV；本地禁用，真实公网计数未核实。成功、失败、超时路径的网络mock不代表真实访问量。
- 字体与工具图标的许可证不覆盖应用代码或KARDS素材。没有新增统一MIT等项目授权许可。
