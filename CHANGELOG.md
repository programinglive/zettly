# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.11.10](https://github.com/programinglive/todo/compare/v0.11.9...v0.11.10) (2025-12-24)


### 🐛 Bug Fixes

* **graph:** add flexible URL config for production websocket and api ([3efeec4](https://github.com/programinglive/todo/commit/3efeec45879ad9d2c68fe842a5117e92c09ed785))

### [0.11.9](https://github.com/programinglive/todo/compare/v0.11.8...v0.11.9) (2025-12-24)


### 🐛 Bug Fixes

* **build:** make husky optional during installation to avoid server build failures ([4dba928](https://github.com/programinglive/todo/commit/4dba9281e1535dc03bb7e46783e18fd5f9188206))

### [0.11.8](https://github.com/programinglive/todo/compare/v0.11.7...v0.11.8) (2025-12-24)


### 🐛 Bug Fixes

* **pwa:** improve install prompt behavior and fix search input accessibility ([e422dbc](https://github.com/programinglive/todo/commit/e422dbc79d7803b5b239953267d59481b36a5a94))

### [0.11.7](https://github.com/programinglive/todo/compare/v0.11.6...v0.11.7) (2025-12-24)


### 🧹 Chores

* **tooling:** setup commiter and clean tsconfig types ([e0f31ff](https://github.com/programinglive/todo/commit/e0f31ffab15051548114ac59163b04b3760997d5))


### ✨ Features

* **graph:** implement real-time graph visualization for todos and notes ([4b4b384](https://github.com/programinglive/todo/commit/4b4b38421a2f047ec9eea748aa4889492818e74e))

### [0.11.6](https://github.com/programinglive/todo/compare/v0.11.5...v0.11.6) (2025-12-07)


### 🧹 Chores

* update documentation 0.11.5 ([0efb951](https://github.com/programinglive/todo/commit/0efb951adb956d3eac8d2f4cdfe0eea8712edeca))


### ♻️ Refactors

* simplify dashboard layout to use only black, white, and gray colors ([b96ad4f](https://github.com/programinglive/todo/commit/b96ad4f527608ace2da89294a5c5a9d9f079fdb2))


### 📝 Documentation

* add comprehensive two-color design system documentation ([b8d5c46](https://github.com/programinglive/todo/commit/b8d5c469a2ed0c7c375a7563742aaa83fa40abc8))


### 🐛 Bug Fixes

* add text color to Q3 delegate quadrant for better contrast ([415ffc5](https://github.com/programinglive/todo/commit/415ffc51bb6e47f55f2d92d187919c166e87b1e4))
* resolve 419 CSRF error when marking todo as complete ([ce4511d](https://github.com/programinglive/todo/commit/ce4511dca3d113363598705586c0183052d2e461))


### 💄 Styles

* apply two-color UI to todos and navigation ([fb0bc6c](https://github.com/programinglive/todo/commit/fb0bc6c6eb3e95289cca8fd28b6581d72e244913))

### [0.11.5](https://github.com/programinglive/todo/compare/v0.11.4...v0.11.5) (2025-12-02)


### 🐛 Bug Fixes

* use standard vite build command to ensure env vars are loaded ([e503e8d](https://github.com/programinglive/todo/commit/e503e8d924a21d009f3b5192ac45ade80a1d5082))

### [0.11.4](https://github.com/programinglive/todo/compare/v0.11.3...v0.11.4) (2025-12-02)


### 🐛 Bug Fixes

* force https scheme in production ([c4a9d9d](https://github.com/programinglive/todo/commit/c4a9d9df3df7c9bee8cdb618f654044885e8aec4))

### [0.11.3](https://github.com/programinglive/todo/compare/v0.11.2...v0.11.3) (2025-12-02)


### 🐛 Bug Fixes

* make husky installation optional in production ([78f27cc](https://github.com/programinglive/todo/commit/78f27cc58a9c4099e3b5a2b5623fa8d82d0d8e3c))
* move @headlessui/react to dependencies ([9b634ca](https://github.com/programinglive/todo/commit/9b634ca214d803ce14720788607302a113d72dc4))
* move axios, laravel-echo, pusher-js to dependencies ([36d19a2](https://github.com/programinglive/todo/commit/36d19a27d8a869d54c6642cfef759bb1f63a0f4f))
* move build dependencies to production dependencies ([db0f1d1](https://github.com/programinglive/todo/commit/db0f1d17a68103f9ae0486878809798cace29d39))
* move vite-plugin-pwa to dependencies ([d915487](https://github.com/programinglive/todo/commit/d915487e6b3184c55fad562a5f1366059c8fd2d1))

### [0.11.2](https://github.com/programinglive/todo/compare/v0.11.1...v0.11.2) (2025-12-02)


### ✨ Features

* add database sync command for production to local sync ([29fb811](https://github.com/programinglive/todo/commit/29fb811c340fd6e5cb66d679d4046e3330699a05))

### [0.11.1](https://github.com/programinglive/todo/compare/v0.11.0...v0.11.1) (2025-12-02)


### 🧹 Chores

* cleanup project structure and update dependencies ([85858e5](https://github.com/programinglive/todo/commit/85858e5048999b1ff0f0eeab1414d845a7ece809))

## [0.11.0](https://github.com/programinglive/todo/compare/v0.10.19...v0.11.0) (2025-11-27)


### 📝 Documentation

* consolidate release notes and update for v0.10.19 ([2561015](https://github.com/programinglive/todo/commit/2561015af0f1607f5f02d97a310ff6c9ecabc949))


### 🐛 Bug Fixes

* csrf token mismatch - refactor to use axios with cookie-based csrf protection ([aa6b2c8](https://github.com/programinglive/todo/commit/aa6b2c811ea8efc84b3eecc011eeec7a6f747d39))
* php 8+ parameter order warning in ResilientDatabaseStore ([0e5f2be](https://github.com/programinglive/todo/commit/0e5f2bef7ad1ad5e9a1ce86db6dee2ad5534e723))


### ✨ Features

* add focus edit functionality and fix history auto-update ([506ad55](https://github.com/programinglive/todo/commit/506ad5505622045241820bdc63c096e45a3861fa))

### [0.10.19](https://github.com/programinglive/todo/compare/v0.10.18...v0.10.19) (2025-11-22)


### 🧹 Chores

* **deps-dev:** bump js-yaml from 4.1.0 to 4.1.1 ([754d0f7](https://github.com/programinglive/todo/commit/754d0f76c5358fc652a848e954adc9f4d2b71f0a))
* **deps:** bump glob from 10.4.5 to 10.5.0 ([7071d22](https://github.com/programinglive/todo/commit/7071d2279bbdef7e28fcd761778b42a63cbd09a9))
* **deps:** bump symfony/http-foundation from 7.3.5 to 7.3.7 ([6811092](https://github.com/programinglive/todo/commit/6811092609044e0bf35ab6436d4f97ef7a4e1d04))
* save current work before fixing csrf issues ([3a96610](https://github.com/programinglive/todo/commit/3a966107a14bf6cc4f430ceea936eccfe27160e3))


### 🐛 Bug Fixes

* resolve csrf token mismatch and add regression tests ([4dc4a32](https://github.com/programinglive/todo/commit/4dc4a32702c8e1f1e80901d4f6da549821d097e9))
* update release scripts to support ESM ([7652b20](https://github.com/programinglive/todo/commit/7652b200d63949bdc3a754f7ff72304104687a28))

### [0.10.18](https://github.com/programinglive/todo/compare/v0.10.17...v0.10.18) (2025-11-09)


### 📝 Documentation

* add v0.10.18 release notes with detailed feature documentation ([820f303](https://github.com/programinglive/todo/commit/820f303c18309718053b5d6dce1a9b754c7da200))
* extract key features into individual markdown files ([7536a2b](https://github.com/programinglive/todo/commit/7536a2b1e00ce8e437793c0cc317fc7192174713))

### [0.10.17](https://github.com/programinglive/todo/compare/v0.10.16...v0.10.17) (2025-11-09)


### 🐛 Bug Fixes

* harden database cache fallback ([5601e34](https://github.com/programinglive/todo/commit/5601e34e1bebfef6180bfe144bfc994a23436eb5))
* harden database connection handling ([9d8a4e6](https://github.com/programinglive/todo/commit/9d8a4e61903bd26ed961b6701b20b93a0d7ded53))

### [0.10.16](https://github.com/programinglive/todo/compare/v0.10.15...v0.10.16) (2025-11-09)


### 🐛 Bug Fixes

* handle database connection errors gracefully ([6dae4ae](https://github.com/programinglive/todo/commit/6dae4ae7c15c2360e0a55f0e9df477578d266783))

### [0.10.15](https://github.com/programinglive/todo/compare/v0.10.14...v0.10.15) (2025-11-08)


### ✨ Features

* **csrf:** harden workspace preference update ([9b12345](https://github.com/programinglive/todo/commit/9b123456fec15e30a4b2426a243b9e660f55d7c0))

### [0.10.14](https://github.com/programinglive/todo/compare/v0.10.13...v0.10.14) (2025-11-08)


### ✨ Features

* **email:** notify drawing changes ([0126eb3](https://github.com/programinglive/todo/commit/0126eb3dd4e864f192bbd9604ef593504c20abf6))

### [0.10.13](https://github.com/programinglive/todo/compare/v0.10.12...v0.10.13) (2025-11-08)


### ✨ Features

* **email:** add note notifications ([5bcd091](https://github.com/programinglive/todo/commit/5bcd091adb3118036e75a2000d278537f1372d9a))

### [0.10.12](https://github.com/programinglive/todo/compare/v0.10.11...v0.10.12) (2025-11-08)


### 🐛 Bug Fixes

* ensure todo deletion sends valid CSRF token ([187b3c3](https://github.com/programinglive/todo/commit/187b3c30ae731ab9210fd0b6e7b57895e786742b))


### 🧹 Chores

* add plesk laravel integration dependency ([a59498a](https://github.com/programinglive/todo/commit/a59498a16bf42f71121ff65b2c085b00f95dc438))

### [0.10.11](https://github.com/programinglive/todo/compare/v0.10.10...v0.10.11) (2025-11-08)


### 🐛 Bug Fixes

* refresh csrf token from cookie after logout ([dd975f1](https://github.com/programinglive/todo/commit/dd975f186e4b46fde580e5e79ce64eb79d7931ed))

### [0.10.10](https://github.com/programinglive/todo/compare/v0.10.9...v0.10.10) (2025-11-08)


### 🐛 Bug Fixes

* prevent duplicate verification emails on signup ([1e16b24](https://github.com/programinglive/todo/commit/1e16b245e90bbd51f3002f65e60f1a6e8836b050))

### [0.10.9](https://github.com/programinglive/todo/compare/v0.10.8...v0.10.9) (2025-11-08)


### 🧹 Chores

* swap auth logo and fix resend verification csrf ([c6adf8e](https://github.com/programinglive/todo/commit/c6adf8ee77a25b35a8e949f8617b279188546cb0))


### ✨ Features

* queue welcome email for new users and restrict log viewer ([433e17c](https://github.com/programinglive/todo/commit/433e17c4fa43e46776c1e2bca355b607d3e83b56))

### [0.10.8](https://github.com/programinglive/todo/compare/v0.10.7...v0.10.8) (2025-11-08)


### 🐛 Bug Fixes

* queue password resets and trim drawing payload metadata ([d46ce61](https://github.com/programinglive/todo/commit/d46ce610496d6d2828c0ca6b37309d6284ad5750))

### [0.10.7](https://github.com/programinglive/todo/compare/v0.10.6...v0.10.7) (2025-11-08)


### ✨ Features

* notify todo updates and clean organization tests ([8d53111](https://github.com/programinglive/todo/commit/8d53111ca458955621578491c5fb56027554a4a3))

### [0.10.6](https://github.com/programinglive/todo/compare/v0.10.5...v0.10.6) (2025-11-08)


### ✨ Features

* queue todo creation email and quiet broadcast logs ([e6bcffb](https://github.com/programinglive/todo/commit/e6bcffbb19f7362e06afadf7cb162d1283672bb5))

### [0.10.5](https://github.com/programinglive/todo/compare/v0.10.4...v0.10.5) (2025-11-08)


### 🐛 Bug Fixes

* enforce broadcast payload limits and queue email notifications ([6bccbe4](https://github.com/programinglive/todo/commit/6bccbe4eacc6a0b8bd02e81777e9d6fbc247633e))

### [0.10.4](https://github.com/programinglive/todo/compare/v0.10.3...v0.10.4) (2025-11-07)


### 🐛 Bug Fixes

* normalize SMTP configuration and harden email test endpoint ([6c83172](https://github.com/programinglive/todo/commit/6c8317282fcc888b05e228e6a66c4ccf95a85abe))

### [0.10.3](https://github.com/programinglive/todo/compare/v0.10.2...v0.10.3) (2025-11-07)


### 🐛 Bug Fixes

* organization invite form CSRF token handling ([eabf853](https://github.com/programinglive/todo/commit/eabf853c5a7ab6cdeba370ee239ed5cc799cfe29))

### [0.10.2](https://github.com/programinglive/todo/compare/v0.10.1...v0.10.2) (2025-11-07)


### 🐛 Bug Fixes

* correct import paths for Organization components (case-sensitive) ([24a6bbd](https://github.com/programinglive/todo/commit/24a6bbddb40bc82e3a2b3a549525885503312b2a))

### [0.10.1](https://github.com/programinglive/todo/compare/v0.10.0...v0.10.1) (2025-11-07)


### 🐛 Bug Fixes

* replace shadcn/ui components with existing project components in Organization pages ([5e8b1d7](https://github.com/programinglive/todo/commit/5e8b1d7e17031c70fa51ed30357e371cd1e13a6b))

## [0.10.0](https://github.com/programinglive/todo/compare/v0.9.7...v0.10.0) (2025-11-07)


### ✨ Features

* organization admin management improvements ([0b469ad](https://github.com/programinglive/todo/commit/0b469ad01dedd31b0624fbec0dd48360b1e08d44))

### [0.9.7](https://github.com/programinglive/todo/compare/v0.9.6...v0.9.7) (2025-11-06)


### 📝 Documentation

* update release notes for v0.9.6 ([5338d6b](https://github.com/programinglive/todo/commit/5338d6b1d983263da43133744d496cdf23419591))


### 🐛 Bug Fixes

* widen focus title input ([cef0430](https://github.com/programinglive/todo/commit/cef0430bb309fd4c59f9e102b393a4730afc3875))

### [0.9.6](https://github.com/programinglive/todo/compare/v0.9.5...v0.9.6) (2025-11-06)


### ✨ Features

* add super-admin email test console ([6583adc](https://github.com/programinglive/todo/commit/6583adc93bd577a458073ca55228608663bd9b27))

### [0.9.5](https://github.com/programinglive/todo/compare/v0.9.4...v0.9.5) (2025-11-06)


### 🐛 Bug Fixes

* harden CSRF handling for custom fetch calls ([c385d6e](https://github.com/programinglive/todo/commit/c385d6e9c562dd507153151bbbfffb1f14afc959))

### [0.9.4](https://github.com/programinglive/todo/compare/v0.9.3...v0.9.4) (2025-11-06)


### 🐛 Bug Fixes

* enrich focus history display ([e348b4f](https://github.com/programinglive/todo/commit/e348b4f8df063a67562cacdcd6b84d4783c0ca2a))

### [0.9.3](https://github.com/programinglive/todo/compare/v0.9.1...v0.9.3) (2025-11-06)


### 🧹 Chores

* **release:** 0.9.1 🚀 ([f91c930](https://github.com/programinglive/todo/commit/f91c9307963e948609f78c3d33f6ac013e9a5321))
* **release:** 0.9.2 🚀 ([8915a04](https://github.com/programinglive/todo/commit/8915a04de89e7cbc92f5d6db3e2d5e60233a021b))

### [0.9.2](https://github.com/programinglive/todo/compare/v0.9.0...v0.9.2) (2025-11-06)


### 🐛 Bug Fixes

* wrap focus history reasons ([dff7140](https://github.com/programinglive/todo/commit/dff7140c9d3fa6717bc4f4ab5bcc1735d93d37a8))


### 🧹 Chores

* **release:** 0.9.1 🚀 ([aaf3679](https://github.com/programinglive/todo/commit/aaf3679f47856b988706fd646a9c31d1a06b4fb2))

### [0.9.1](https://github.com/programinglive/todo/compare/v0.9.0...v0.9.1) (2025-11-05)


### 🐛 Bug Fixes

* wrap focus history reasons ([dff7140](https://github.com/programinglive/todo/commit/dff7140c9d3fa6717bc4f4ab5bcc1735d93d37a8))

## [0.9.0](https://github.com/programinglive/todo/compare/v0.8.20...v0.9.0) (2025-11-05)


### 🐛 Bug Fixes

* ensure kanban drag inserts after target when moving down ([c033cfa](https://github.com/programinglive/todo/commit/c033cfa46f66bdf2ea58c55160d894c6a523204a))

### [0.8.20](https://github.com/programinglive/todo/compare/v0.8.19...v0.8.20) (2025-11-05)


### 🐛 Bug Fixes

* stop inertia json error when reordering in eisenhower matrix ([c8555d2](https://github.com/programinglive/todo/commit/c8555d230643705c5544b36e7b40743d09223511))

### [0.8.19](https://github.com/programinglive/todo/compare/v0.8.18...v0.8.19) (2025-11-05)

### [0.8.18](https://github.com/programinglive/todo/compare/v0.8.17...v0.8.18) (2025-11-05)


### 🐛 Bug Fixes

* ensure kanban reorder updates UI ordering immediately ([9961407](https://github.com/programinglive/todo/commit/9961407d2d2bef0a9c6c665b1f67651bb07a1a4d))

### [0.8.17](https://github.com/programinglive/todo/compare/v0.8.16...v0.8.17) (2025-11-05)


### 🐛 Bug Fixes

* kanban reorder updates todo properties when moving between columns ([638accf](https://github.com/programinglive/todo/commit/638accfbce1263c861e07622b828c30dcc410072))

### [0.8.16](https://github.com/programinglive/todo/compare/v0.8.15...v0.8.16) (2025-11-05)


### 🐛 Bug Fixes

* kanban reorder Inertia response error by using fetch API ([5f4e53e](https://github.com/programinglive/todo/commit/5f4e53e94619bd92adaa5e6af7f660974db4f6bd))

### [0.8.15](https://github.com/programinglive/todo/compare/v0.8.14...v0.8.15) (2025-11-05)


### 🐛 Bug Fixes

* dark mode theme toggle and add reorder debug logging ([ccb7b0a](https://github.com/programinglive/todo/commit/ccb7b0a600697bc60dcb3309dd2421b3e7167b59))

### [0.8.14](https://github.com/programinglive/todo/compare/v0.8.13...v0.8.14) (2025-11-05)


### 🐛 Bug Fixes

* kanban board reorder error handling not reverting todos on failure ([00ca6b1](https://github.com/programinglive/todo/commit/00ca6b1757f008f525a18c607df003b625fc9670))

### [0.8.13](https://github.com/programinglive/todo/compare/v0.8.12...v0.8.13) (2025-11-05)


### 🐛 Bug Fixes

* kanban board reorder onSuccess handler expecting page object from JSON ([1b83ecf](https://github.com/programinglive/todo/commit/1b83ecf7e81de217a053a0d059ca24fedef884ed))

### [0.8.12](https://github.com/programinglive/todo/compare/v0.8.11...v0.8.12) (2025-11-05)


### 🐛 Bug Fixes

* kanban board reorder returning redirect instead of JSON ([abac318](https://github.com/programinglive/todo/commit/abac31873542b123bc3cb9598e3bb113ef8f0ada))

### [0.8.11](https://github.com/programinglive/todo/compare/v0.8.10...v0.8.11) (2025-11-05)


### 🐛 Bug Fixes

* 419 CSRF token error when moving todos between Eisenhower quadrants ([7e83d4c](https://github.com/programinglive/todo/commit/7e83d4ca29db79faa91557b9712a0eb54a4696c6))

### [0.8.10](https://github.com/programinglive/todo/compare/v0.8.9...v0.8.10) (2025-11-04)


### ✨ Features

* seed focus and drawing demo data ([1917261](https://github.com/programinglive/todo/commit/1917261789194deadf27ff20b36f20441b4ef9b2))

### [0.8.9](https://github.com/programinglive/todo/compare/v0.8.8...v0.8.9) (2025-11-04)


### 🐛 Bug Fixes

* guard kanban ordering when column missing ([8b4d2cd](https://github.com/programinglive/todo/commit/8b4d2cd5bdb02928d335bb623441801fccda7bc0))

### [0.8.8](https://github.com/programinglive/todo/compare/v0.8.7...v0.8.8) (2025-11-04)


### ✨ Features

* add comprehensive reorder debug tools and documentation ([6527fd3](https://github.com/programinglive/todo/commit/6527fd306821ed79aa8913665aa066e8daabcaf3))


### 📝 Documentation

* add comprehensive debug panel troubleshooting guide ([e2e23df](https://github.com/programinglive/todo/commit/e2e23dffc85553f39cdb87002ca66b3df63ff46b))


### 🐛 Bug Fixes

* add missing closestCenter import to KanbanBoard ([8a8d3ae](https://github.com/programinglive/todo/commit/8a8d3ae4dcfa46e09dd47aeaa5203b71913f6841))
* add missing verticalListSortingStrategy import ([2995868](https://github.com/programinglive/todo/commit/29958682d5d574432fd0997dabb6e7d386dc454e))
* auto-update UI on reorder without page refresh ([521d34e](https://github.com/programinglive/todo/commit/521d34ea8682f544d2e69e6dc55eda03be9dce7d))
* enable debug mode for all users and start monitoring by default ([99745c0](https://github.com/programinglive/todo/commit/99745c070051720d81e8e378d8f7239c6ca5b0c6))
* improve debug panel to capture dnd-kit drag events ([3f84921](https://github.com/programinglive/todo/commit/3f84921754ad00dc3321a129b565f98aa174182a))
* make reorder endpoint return JSON to prevent page reload ([3529d79](https://github.com/programinglive/todo/commit/3529d791f0c9b63382b40823cc6797b68e070c84))
* **matrix:** persist in-quadrant reordering and chain reorder after Eisenhower updates ([2f5d0df](https://github.com/programinglive/todo/commit/2f5d0df1d8a62a8f6fac555adbeedc310c5c1c08))

### [0.8.7](https://github.com/programinglive/todo/compare/v0.8.6...v0.8.7) (2025-11-04)


### 🐛 Bug Fixes

* correct kanban board reordering logic to maintain proper todo order ([92469f9](https://github.com/programinglive/todo/commit/92469f96f34e76136eee43bf5ce3277020d35579))

### [0.8.6](https://github.com/programinglive/todo/compare/v0.8.5...v0.8.6) (2025-11-04)


### 🐛 Bug Fixes

* suppress zero artifacts in todo details ([5b91ee4](https://github.com/programinglive/todo/commit/5b91ee466b192be95223b2b51ffcd8c1d07b2110))

### [0.8.5](https://github.com/programinglive/todo/compare/v0.8.4...v0.8.5) (2025-11-04)


### 💄 Styles

* polish focus greeting dark theme ([96fb124](https://github.com/programinglive/todo/commit/96fb124046b0075cb75ecece647f1df6f33f676f))

### [0.8.4](https://github.com/programinglive/todo/compare/v0.8.3...v0.8.4) (2025-11-04)


### ✨ Features

* require focus completion reasons ([105631c](https://github.com/programinglive/todo/commit/105631c4eeb95048d1553c73bd8f94ae76190c36))

### [0.8.3](https://github.com/programinglive/todo/compare/v0.8.2...v0.8.3) (2025-11-04)


### ✨ Features

* prompt for next focus after completion ([cb5bc72](https://github.com/programinglive/todo/commit/cb5bc72e3099b8692835805996339bcbac76832f))


### 🐛 Bug Fixes

* **focus:** adjust tablet auto-open behavior ([0d04eb2](https://github.com/programinglive/todo/commit/0d04eb278569d4f52fc9c12711fdbb7efab97d5c))

### [0.8.2](https://github.com/programinglive/todo/compare/v0.8.1...v0.8.2) (2025-11-04)


### ✨ Features

* improve focus dialog experience ([38e5155](https://github.com/programinglive/todo/commit/38e51557a26baba62df97d33e5dfb4a811139c62))

### [0.8.1](https://github.com/programinglive/todo/compare/v0.8.0...v0.8.1) (2025-11-04)


### ✨ Features

* add focus greeting feature with daily focus tracking ([5683d3d](https://github.com/programinglive/todo/commit/5683d3ddf92fd8f6d2ac7c54d3142f9fb1275152))

## [0.8.0](https://github.com/programinglive/todo/compare/v0.7.13...v0.8.0) (2025-11-03)


### 🐛 Bug Fixes

* rely on inertia csrf handler for login ([483df7f](https://github.com/programinglive/todo/commit/483df7f7992552f97f4a260b88a26d5947a07473))

### [0.7.13](https://github.com/programinglive/todo/compare/v0.7.12...v0.7.13) (2025-11-03)


### ✨ Features

* articulate intentional story on landing page ([26fefa8](https://github.com/programinglive/todo/commit/26fefa8cd0407315240b05e34d4da11c8aafc3a2))

### [0.7.12](https://github.com/programinglive/todo/compare/v0.7.11...v0.7.12) (2025-11-03)

### [0.7.11](https://github.com/programinglive/todo/compare/v0.7.10...v0.7.11) (2025-11-03)


### ✨ Features

* **search:** add navbar clear control with docs and tests ([ba8ba71](https://github.com/programinglive/todo/commit/ba8ba7143fe370b4a71e38a68bfd153ef3da5916))

### [0.7.10](https://github.com/programinglive/todo/compare/v0.7.9...v0.7.10) (2025-11-03)


### ✨ Features

* **nav:** refine account menu grouping ([b41ae72](https://github.com/programinglive/todo/commit/b41ae72566fbc75aaebd3417d4797684a47456d8))

### [0.7.9](https://github.com/programinglive/todo/compare/v0.7.8...v0.7.9) (2025-11-03)


### ✨ Features

* **nav:** streamline account menu and flatten editor styling ([0c6d79c](https://github.com/programinglive/todo/commit/0c6d79c00a5929acea48aec2ce302c6006cb1ff9))

### [0.7.8](https://github.com/programinglive/todo/compare/v0.7.7...v0.7.8) (2025-11-03)


### 🐛 Bug Fixes

* **todo:** align metadata sections and date inputs ([cb901b7](https://github.com/programinglive/todo/commit/cb901b7914346c7cd524bf3854ec9891ad16933c))

### [0.7.7](https://github.com/programinglive/todo/compare/v0.7.6...v0.7.7) (2025-11-03)


### 🐛 Bug Fixes

* open context drawer when selecting kanban card ([f769df8](https://github.com/programinglive/todo/commit/f769df89d7763dfa38fd5f795325da82417b5979))

### [0.7.6](https://github.com/programinglive/todo/compare/v0.7.5...v0.7.6) (2025-11-03)


### 📝 Documentation

* add community guidelines and release notes link ([354a26c](https://github.com/programinglive/todo/commit/354a26c04fdc9b9631988cf58feab92e891e9c9c))

### [0.7.5](https://github.com/programinglive/todo/compare/v0.7.4...v0.7.5) (2025-11-03)


### 🐛 Bug Fixes

* reason dialog hydration across all status transitions ([0263fbb](https://github.com/programinglive/todo/commit/0263fbbf951756368d1fe169dd61048ceb6df4f4))

### [0.7.4](https://github.com/programinglive/todo/compare/v0.7.3...v0.7.4) (2025-11-03)


### ✨ Features

* add tablet todo split view actions ([3778cd3](https://github.com/programinglive/todo/commit/3778cd3c7fbb5742639d650e63ab6f8c15a87b75))

### [0.7.3](https://github.com/programinglive/todo/compare/v0.7.2...v0.7.3) (2025-11-03)


### 🐛 Bug Fixes

* ensure archive flows collect reasons and log status events ([79709f7](https://github.com/programinglive/todo/commit/79709f7b1e4e6e4936928cc085396a7eb4f99f97))

### [0.7.2](https://github.com/programinglive/todo/compare/v0.7.1...v0.7.2) (2025-11-03)


### 🐛 Bug Fixes

* **todos:** add checklist item toggle handler and regression tests ([03b08f3](https://github.com/programinglive/todo/commit/03b08f335419da1da9e96cf1b1e3516c99b79086))

### [0.7.1](https://github.com/programinglive/todo/compare/v0.7.0...v0.7.1) (2025-11-03)


### 🐛 Bug Fixes

* **pusher:** reduce broadcast payload size to prevent exceeding 10KB limit ([b5248d8](https://github.com/programinglive/todo/commit/b5248d84e7f1aa2080752db1c7fa4c51ab0aa85b))

## [0.7.0](https://github.com/programinglive/todo/compare/v0.6.10...v0.7.0) (2025-11-03)


### 🐛 Bug Fixes

* show todo status history and ensure csrf coverage ([a5aeecf](https://github.com/programinglive/todo/commit/a5aeecf7550f199d60825807c4c8159ee06b98a5))

### [0.6.10](https://github.com/programinglive/todo/compare/v0.6.9...v0.6.10) (2025-11-03)


### ✨ Features

* implement updateEisenhower endpoint for Eisenhower matrix quadrant updates ([3bf7d14](https://github.com/programinglive/todo/commit/3bf7d14d47b6a30e370f9dea0d4dc33995efee2d))

### [0.6.9](https://github.com/programinglive/todo/compare/v0.6.8...v0.6.9) (2025-11-02)


### 🐛 Bug Fixes

* stabilize drawing actions and tag creation ([6dafcce](https://github.com/programinglive/todo/commit/6dafcce54dd2049f1171be6c7633b3704e2c2c76))

### [0.6.9](https://github.com/programinglive/todo/compare/v0.6.8...v0.6.9) (2025-11-02)


### 🐛 Bug Fixes

* ensure tag creation uses axios with credentials to avoid intermittent 419 errors and adjust todo form ordering
* move drawing page navigation buttons outside the canvas container and gate debug logs behind the toggle


### ✅ Tests

* add regression coverage for JSON tag create/update flows

### [0.6.8](https://github.com/programinglive/todo/compare/v0.6.7...v0.6.8) (2025-11-02)


### 🐛 Bug Fixes

* align debug mode toggle with notification switch styling and add comprehensive tests ([b956db1](https://github.com/programinglive/todo/commit/b956db1bc36115b04f28c3e798f10e9e23300593))

### [0.6.7](https://github.com/programinglive/todo/compare/v0.6.6...v0.6.7) (2025-11-02)


### 🐛 Bug Fixes

* debug mode toggle className template literal syntax error ([a6ddb69](https://github.com/programinglive/todo/commit/a6ddb694d9556f3ea2ceead5398d64839212cf03))

### [0.6.6](https://github.com/programinglive/todo/compare/v0.6.5...v0.6.6) (2025-11-02)


### 🐛 Bug Fixes

* align PSR-3 logger signatures and adopt semver ranges for dependencies ([ce0bfea](https://github.com/programinglive/todo/commit/ce0bfeae6cb89ce33f828bdca4cbb2554a600920))

### [0.6.6](https://github.com/programinglive/todo/compare/v0.6.5...v0.6.6) (2025-11-02)


### 🐛 Bug Fixes

* align PSR-3 logger signatures by refreshing composer dependencies


### 🧹 Chores

* adopt semver ranges for google/apiclient and sentry-laravel constraints


### [0.6.5](https://github.com/programinglive/todo/compare/v0.6.4...v0.6.5) (2025-11-02)


### 🧹 Chores

* migrate docs and refine system monitor layout ([d799956](https://github.com/programinglive/todo/commit/d7999566d59d25920f92707d0f35001ca39f06eb))
* remove relocated root markdown files ([ec29d05](https://github.com/programinglive/todo/commit/ec29d0506883c889e8c87266d42bacd884c05fd9))

### [0.6.4](https://github.com/programinglive/todo/compare/v0.6.3...v0.6.4) (2025-10-31)


### 🐛 Bug Fixes

* prevent oversize TLDraw broadcast payloads ([6ccaa4b](https://github.com/programinglive/todo/commit/6ccaa4b250cd2e2b6413a57b03fafafed226d466))


### ✨ Features

* add super administrator monitoring and PRD ([bde9553](https://github.com/programinglive/todo/commit/bde95539584a3d06172201fef8a9633c01228924))
* enhance system monitor admin insights ([b08297e](https://github.com/programinglive/todo/commit/b08297ebf72303d8f11e69950edac119b5e983a0))

### [0.6.3](https://github.com/programinglive/todo/compare/v0.6.2...v0.6.3) (2025-10-30)


### 🐛 Bug Fixes

* reduce TLDraw broadcast payload size ([762f6a8](https://github.com/programinglive/todo/commit/762f6a8742f25a9a9f19d90cd55b4bb57f31a6c5))

### [0.6.2](https://github.com/programinglive/todo/compare/v0.6.1...v0.6.2) (2025-10-30)


### 🐛 Bug Fixes

* **auth:** append csrf token when logging in ([9139cd3](https://github.com/programinglive/todo/commit/9139cd36f71bc49d96ca1a957ce80bb55820a716))

### [0.6.1](https://github.com/programinglive/todo/compare/v0.6.0...v0.6.1) (2025-10-30)


### 🐛 Bug Fixes

* **todo:** include csrf token in edit form submissions ([4b9270a](https://github.com/programinglive/todo/commit/4b9270ab65b17964c3cb6285ab5a7a642d6d8098))

## [0.6.0](https://github.com/programinglive/todo/compare/v0.5.62...v0.6.0) (2025-10-29)

### [0.5.62](https://github.com/programinglive/todo/compare/v0.5.61...v0.5.62) (2025-10-29)


### ✨ Features

* add Sentry integration docs and commands ([9167c64](https://github.com/programinglive/todo/commit/9167c64ff75a37f871e0e647c2bc5b4dfc190d49))

### [0.5.61](https://github.com/programinglive/todo/compare/v0.5.60...v0.5.61) (2025-10-28)


### ♻️ Refactors

* compact priority selector and reorder due date field ([c0ac0fe](https://github.com/programinglive/todo/commit/c0ac0fefe7fdfcfc7b73cb29b3a493ab268e77ff))

### [0.5.60](https://github.com/programinglive/todo/compare/v0.5.59...v0.5.60) (2025-10-28)

### [0.5.59](https://github.com/programinglive/todo/compare/v0.5.58...v0.5.59) (2025-10-28)


### 🐛 Bug Fixes

* expand todo detail layout and avoid unused preloads ([a5c436e](https://github.com/programinglive/todo/commit/a5c436efcdc8d7b9208279047096dab53bf8debf))
* show archived badge on todo details ([46231d1](https://github.com/programinglive/todo/commit/46231d1b79ab90dd1ec044c3839496f94d44993d))
* surface due date ahead of priority and compact the selector layout on todo forms

### ✅ Tests

* add coverage ensuring due date precedes priority and priority selector stays stacked

### [0.5.58](https://github.com/programinglive/todo/compare/v0.5.57...v0.5.58) (2025-10-28)


### 🐛 Bug Fixes

* gate system status widget behind debug flag ([8bf37a7](https://github.com/programinglive/todo/commit/8bf37a72d11f26d95622aaa1171bf9a41fb365f7))
* display "Archived" badge on todo detail view when item is archived
* refresh todo detail layout to better utilize desktop width while keeping responsive behavior
* stop preloading unused CSS bundle emitted by Vite

### [0.5.57](https://github.com/programinglive/todo/compare/v0.5.56...v0.5.57) (2025-10-28)


### ♻️ Refactors

* improve dashboard attachments and storage handling ([de272d1](https://github.com/programinglive/todo/commit/de272d1c085291b905077733239bfc38c933c196))

### [0.5.56](https://github.com/programinglive/todo/compare/v0.5.55...v0.5.56) (2025-10-28)


### 🐛 Bug Fixes

* align account menus and tidy todo forms ([27460e5](https://github.com/programinglive/todo/commit/27460e5365b569a899c2b8eb7d14f197f4b6dfb1))
* guard draw routes against non-numeric ids ([f7313f8](https://github.com/programinglive/todo/commit/f7313f8827d95a1bfd5ccaa8f40a71eea9fa8a4b))


### 🧹 Chores

* enable frontend sentry capture ([0b09e8d](https://github.com/programinglive/todo/commit/0b09e8d312c3dc355c66cb26b4dad48a5aac96aa))


### ✨ Features

* streamline todo forms ([0e638c0](https://github.com/programinglive/todo/commit/0e638c05703e901496538fbdd7e1bd152d9be01d))


### 📝 Documentation

* refresh legal contact emails ([748e3be](https://github.com/programinglive/todo/commit/748e3be5ef66eda94ac3c0fc42866e87a7a8fd7a))

### [0.5.55](https://github.com/programinglive/todo/compare/v0.5.54...v0.5.55) (2025-10-28)

### [0.5.54](https://github.com/programinglive/todo/compare/v0.5.53...v0.5.54) (2025-10-28)

### 🐛 Bug Fixes

* prevent `/draw/create` from being misinterpreted as a drawing id by ordering routes correctly
* remove redundant “Save now” shortcut buttons on todo create & edit pages
* ensure todo tag selector appears directly beneath the title field for immediate visibility
* remove obsolete todo/note type toggle from todo form to reflect page intent

### ✅ Tests

* add regression coverage for shared account navigation links
* add todo action button tests to ensure duplicate buttons remain removed

### [0.5.53](https://github.com/programinglive/todo/compare/v0.5.52...v0.5.53) (2025-10-28)


### 🐛 Bug Fixes

* ensure mobile account menu includes archived link by sharing navigation items with desktop menu

### ✅ Tests

* guard websocket diagnostics socket id ([7cc926f](https://github.com/programinglive/todo/commit/7cc926fae531a6cfe3c04b331f28e3d20908cecd))

### [0.5.52](https://github.com/programinglive/todo/compare/v0.5.51...v0.5.52) (2025-10-28)


### 🐛 Bug Fixes

* refresh sponsor branding ([93d3c99](https://github.com/programinglive/todo/commit/93d3c99770c18f8da81161d3dd6d20174926a3fb))

### [0.5.51](https://github.com/programinglive/todo/compare/v0.5.50...v0.5.51) (2025-10-28)


### ✨ Features

* **draw:** generate and display gallery thumbnails ([94a0a7e](https://github.com/programinglive/todo/commit/94a0a7efb5dfa7d4a2dd64d181fc62487131ad27))

### [0.5.50](https://github.com/programinglive/todo/compare/v0.5.49...v0.5.50) (2025-10-28)


### 🐛 Bug Fixes

* **drawing:** resolve autosave and load issues ([850c3d8](https://github.com/programinglive/todo/commit/850c3d8fc3e63dc55f4ed49562020c07670f5256))

### [0.5.49](https://github.com/programinglive/todo/compare/v0.5.48...v0.5.49) (2025-10-28)


### ♻️ Refactors

* clean up outdated tests and update controller, routes, and vite config ([31c28e0](https://github.com/programinglive/todo/commit/31c28e08bc0c65468971e1f61b7d44432753d70a))

### [0.5.48](https://github.com/programinglive/todo/compare/v0.5.46...v0.5.48) (2025-10-28)


### 🐛 Bug Fixes

* resolve Draw TypeError by replacing setActiveId and simplifying TLDraw integration ([d56ca28](https://github.com/programinglive/todo/commit/d56ca28f30080ff05ff281fed9037f6790b25976))

### [0.5.47](https://github.com/programinglive/todo/compare/v0.5.46...v0.5.47) (2025-10-28)

### [0.5.46](https://github.com/programinglive/todo/compare/v0.5.45...v0.5.46) (2025-10-27)


### ✨ Features

* add drawing selector dropdown to canvas header ([55d848f](https://github.com/programinglive/todo/commit/55d848f9a8122e7e93c4ebbeced07757c102aaa3))

### [0.5.45](https://github.com/programinglive/todo/compare/v0.5.44...v0.5.45) (2025-10-27)


### ✨ Features

* simplify to single drawing per session to eliminate infinite loops ([2c5872d](https://github.com/programinglive/todo/commit/2c5872de14acb1113d5403b0e0cc4aff1f53e0ef))

### [0.5.44](https://github.com/programinglive/todo/compare/v0.5.43...v0.5.44) (2025-10-27)


### ✨ Features

* complete debug mode console suppression and fix drawing errors ([78867d1](https://github.com/programinglive/todo/commit/78867d10271c0e622ce02cbb0d1b133c9750ba48))


### 🐛 Bug Fixes

* resolve infinite loop requests in drawing switching ([602dfa3](https://github.com/programinglive/todo/commit/602dfa37ee8908e0a086bc053524220f7c1fcfa9))

### [0.5.43](https://github.com/programinglive/todo/compare/v0.5.42...v0.5.43) (2025-10-27)


### ✨ Features

* make WebSocket console logging toggleable via debug mode ([d8b869c](https://github.com/programinglive/todo/commit/d8b869ca7e6d83a65cbf304194a93d180037cd4b))

### [0.5.42](https://github.com/programinglive/todo/compare/v0.5.41...v0.5.42) (2025-10-27)


### 🐛 Bug Fixes

* add sponsors section to correct homepage file ([e5122d4](https://github.com/programinglive/todo/commit/e5122d460038a2309c9961ee217edc9872ba5f46))

### [0.5.41](https://github.com/programinglive/todo/compare/v0.5.40...v0.5.41) (2025-10-27)


### ✨ Features

* add debug mode toggle and fix drawing switching ([befbfc3](https://github.com/programinglive/todo/commit/befbfc34e1fe3a17600896b199b4545924e688cc))

### [0.5.40](https://github.com/programinglive/todo/compare/v0.5.39...v0.5.40) (2025-10-27)


### ✨ Features

* add sponsors section to homepage ([1879018](https://github.com/programinglive/todo/commit/1879018e1583bb416bc1513b501849984614ca54))

### [0.5.39](https://github.com/programinglive/todo/compare/v0.5.38...v0.5.39) (2025-10-27)


### 🐛 Bug Fixes

* allow test channels in WebSocket authorization ([2a7fc90](https://github.com/programinglive/todo/commit/2a7fc908ee7d84b8f37cdc72da5125c8c4685c04))
* correct test channel name to avoid double private- prefix ([093b109](https://github.com/programinglive/todo/commit/093b109880ef0b5e8f19a6dd046b6abffafffb33))
* remove problematic .bind() calls causing t.bind error ([e7ed698](https://github.com/programinglive/todo/commit/e7ed698ccf4eccae17a70b94f5047d34c519d554))

### [0.5.38](https://github.com/programinglive/todo/compare/v0.5.37...v0.5.38) (2025-10-27)


### 🐛 Bug Fixes

* correct HMAC signature for Pusher private channels ([f1a399a](https://github.com/programinglive/todo/commit/f1a399aa197ce37a75fc073b5edeadb5ca895d0d))

### [0.5.37](https://github.com/programinglive/todo/compare/v0.5.36...v0.5.37) (2025-10-27)


### 🐛 Bug Fixes

* enable comprehensive Pusher debugging and force cache refresh ([24f9ee7](https://github.com/programinglive/todo/commit/24f9ee76445951177da034880b4c3dc407910698))

### [0.5.36](https://github.com/programinglive/todo/compare/v0.5.35...v0.5.36) (2025-10-27)


### 🐛 Bug Fixes

* add proper channel authorization to broadcasting auth ([bd467b7](https://github.com/programinglive/todo/commit/bd467b734d0589ae1c376a676614febe202ecd77))
* enhance WebSocket debugging for channel subscriptions ([a3e38d7](https://github.com/programinglive/todo/commit/a3e38d788dbbf877c6ffc5ead7d4ad2ef8dce753))

### [0.5.35](https://github.com/programinglive/todo/compare/v0.5.34...v0.5.35) (2025-10-27)


### 🐛 Bug Fixes

* remove conflicting custom broadcasting auth route ([956dc55](https://github.com/programinglive/todo/commit/956dc552c0be337b9055a19555efdbfa6ac03196))
* restore custom broadcasting auth route with proper configuration ([186de2c](https://github.com/programinglive/todo/commit/186de2cc3bfe88a854395ad9efe70a6082894453))

### [0.5.34](https://github.com/programinglive/todo/compare/v0.5.33...v0.5.34) (2025-10-27)


### 🐛 Bug Fixes

* remove duplicate private prefix from channel names ([b416976](https://github.com/programinglive/todo/commit/b4169769b8dd5705d903f5093664d41cb7290956))

### [0.5.33](https://github.com/programinglive/todo/compare/v0.5.32...v0.5.33) (2025-10-27)


### ✨ Features

* add environment information and fix channel name ([71cf88c](https://github.com/programinglive/todo/commit/71cf88c8338b492dbaa9cce802e7ad29c6f5e30d))

### [0.5.32](https://github.com/programinglive/todo/compare/v0.5.31...v0.5.32) (2025-10-27)


### 🐛 Bug Fixes

* add missing draw.show route to resolve Ziggy error ([1149937](https://github.com/programinglive/todo/commit/11499374896ce83ef5c0cb7103cbc64bca8b8743))

### [0.5.31](https://github.com/programinglive/todo/compare/v0.5.30...v0.5.31) (2025-10-27)


### 📝 Documentation

* add comprehensive WebSocket fix summary ([a35047c](https://github.com/programinglive/todo/commit/a35047c02289975474f4280f0e13f9288dd02fee))

### [0.5.30](https://github.com/programinglive/todo/compare/v0.5.29...v0.5.30) (2025-10-27)


### ✨ Features

* add real drawing channel subscription test ([3674fd1](https://github.com/programinglive/todo/commit/3674fd1d3c3fdc03929592df43a73b3b446956da))

### [0.5.29](https://github.com/programinglive/todo/compare/v0.5.28...v0.5.29) (2025-10-27)


### 🐛 Bug Fixes

* add custom broadcasting auth route and error handling ([aa3f317](https://github.com/programinglive/todo/commit/aa3f3175992e6f8c45c13a0f2fedeef7fee5c6a4))

### [0.5.28](https://github.com/programinglive/todo/compare/v0.5.27...v0.5.28) (2025-10-27)


### 🐛 Bug Fixes

* configure broadcast driver and version properly ([06be773](https://github.com/programinglive/todo/commit/06be773ff8592ad5371cab5f0fb1cbe31945d8a2))

### [0.5.27](https://github.com/programinglive/todo/compare/v0.5.26...v0.5.27) (2025-10-27)


### ✨ Features

* add copy button and fix channel subscription test ([886f13a](https://github.com/programinglive/todo/commit/886f13ae7a6e7754024febd01c8b303d35f6dda0))

### [0.5.26](https://github.com/programinglive/todo/compare/v0.5.25...v0.5.26) (2025-10-27)


### ✨ Features

* comprehensive WebSocket debugging and test page ([03e927b](https://github.com/programinglive/todo/commit/03e927b390c0ee421353165af91a7fda12c6ef23))

### [0.5.25](https://github.com/programinglive/todo/compare/v0.5.24...v0.5.25) (2025-10-27)


### 🐛 Bug Fixes

* make version dynamic and add server debugging ([94ba5ff](https://github.com/programinglive/todo/commit/94ba5ffbf9e9dcd5136b1f9a5bbade98aa232766))

### [0.5.24](https://github.com/programinglive/todo/compare/v0.5.23...v0.5.24) (2025-10-27)


### 🐛 Bug Fixes

* handle 302 redirects and improve authentication status ([4819659](https://github.com/programinglive/todo/commit/481965920c1bb0df5cac4cc9d078f7ff31051284))

### [0.5.23](https://github.com/programinglive/todo/compare/v0.5.22...v0.5.23) (2025-10-27)


### 🐛 Bug Fixes

* revert to Laravel's built-in broadcasting routes ([9c5418a](https://github.com/programinglive/todo/commit/9c5418a01d0f5b21dc2dfa2b4ae881eec02dd422))

### [0.5.22](https://github.com/programinglive/todo/compare/v0.5.21...v0.5.22) (2025-10-27)


### 🐛 Bug Fixes

* move system status to bottom left and fix 500 error ([c2adb94](https://github.com/programinglive/todo/commit/c2adb94a496c5f93abf0f83467433f27d9f7a165))

### [0.5.21](https://github.com/programinglive/todo/compare/v0.5.20...v0.5.21) (2025-10-27)


### 🐛 Bug Fixes

* implement custom broadcast authentication with better debugging ([7765e71](https://github.com/programinglive/todo/commit/7765e71066102b327759acc2c8cf08686e4b06d0))

### [0.5.20](https://github.com/programinglive/todo/compare/v0.5.19...v0.5.20) (2025-10-27)


### 🐛 Bug Fixes

* add authentication middleware to broadcasting routes ([1614fe5](https://github.com/programinglive/todo/commit/1614fe5050533931e6ef9fc5112162e1ecac2bee))

### [0.5.19](https://github.com/programinglive/todo/compare/v0.5.18...v0.5.19) (2025-10-27)


### 🐛 Bug Fixes

* improve WebSocket authentication error handling ([40351ed](https://github.com/programinglive/todo/commit/40351ede220c17230605558d8a7271879dd78e84))

### [0.5.18](https://github.com/programinglive/todo/compare/v0.5.17...v0.5.18) (2025-10-27)


### 🐛 Bug Fixes

* resolve TLDraw validation errors and WebSocket auth issues ([a320b92](https://github.com/programinglive/todo/commit/a320b926d0bfad8d2083caea1352c9907cf3243c))

### [0.5.17](https://github.com/programinglive/todo/compare/v0.5.16...v0.5.17) (2025-10-27)


### ✨ Features

* implement TLDraw real-time sync with Pusher integration ([24d2001](https://github.com/programinglive/todo/commit/24d20011a181784e455784c18ac8566ce07ad470))

### [0.5.16](https://github.com/programinglive/todo/compare/v0.5.15...v0.5.16) (2025-10-27)


### 🧹 Chores

* align version display with shared appVersion ([48444ec](https://github.com/programinglive/todo/commit/48444ecba15610e2fc8ba47e3454657b1348f248))

### [0.5.15](https://github.com/programinglive/todo/compare/v0.5.14...v0.5.15) (2025-10-27)


### 🐛 Bug Fixes

* improve websocket authorization for draw updates ([b974ef7](https://github.com/programinglive/todo/commit/b974ef78623299874b2fa788180c56d06d28f329))

### [0.5.14](https://github.com/programinglive/todo/compare/v0.5.13...v0.5.14) (2025-10-27)


### ✨ Features

* add comprehensive SystemStatus component to dashboard ([db97f92](https://github.com/programinglive/todo/commit/db97f92b65329200eb569c7d5b0095e7fd736625))

### [0.5.13](https://github.com/programinglive/todo/compare/v0.5.12...v0.5.13) (2025-10-27)


### 🐛 Bug Fixes

* simplify broadcast authentication to use Laravel defaults ([edee952](https://github.com/programinglive/todo/commit/edee952ec836ab70a8d166268f5d237f771d36a6))

### [0.5.12](https://github.com/programinglive/todo/compare/v0.5.11...v0.5.12) (2025-10-27)


### ✨ Features

* add version display to authenticated user menu ([f55491e](https://github.com/programinglive/todo/commit/f55491e73e229b5cd5e07d40e55beef6549da3f7))

### [0.5.11](https://github.com/programinglive/todo/compare/v0.5.10...v0.5.11) (2025-10-27)


### 🐛 Bug Fixes

* resolve CSRF and authentication issues for broadcast routes ([735ddbb](https://github.com/programinglive/todo/commit/735ddbbfb84c4b10bd85bcbdcbbd4f1f5da7855c))

### [0.5.10](https://github.com/programinglive/todo/compare/v0.5.9...v0.5.10) (2025-10-27)


### 🐛 Bug Fixes

* prevent infinite WebSocket reconnection loops ([ecb191e](https://github.com/programinglive/todo/commit/ecb191e39c89968724340e9137c56ba3ff2f5efe))

### [0.5.9](https://github.com/programinglive/todo/compare/v0.5.8...v0.5.9) (2025-10-27)


### ✨ Features

* add broadcast authentication debug endpoint ([c54185b](https://github.com/programinglive/todo/commit/c54185b665d8b6f0d8c236b395ad2696e6c317dc))


### 🐛 Bug Fixes

* add missing drawings relationship and improve broadcast auth debugging ([f27579a](https://github.com/programinglive/todo/commit/f27579a6f723e01883282d4b27207efee29f4b3c))

### [0.5.8](https://github.com/programinglive/todo/compare/v0.5.7...v0.5.8) (2025-10-27)

### [0.5.7](https://github.com/programinglive/todo/compare/v0.5.6...v0.5.7) (2025-10-27)


### 🐛 Bug Fixes

* add web middleware to broadcasting routes for authentication ([28b3c29](https://github.com/programinglive/todo/commit/28b3c29c6391bb086957c73424e5f352b58f408c))

### [0.5.6](https://github.com/programinglive/todo/compare/v0.5.5...v0.5.6) (2025-10-27)


### ✨ Features

* add comprehensive WebSocket debugging for live updates ([be73e55](https://github.com/programinglive/todo/commit/be73e557f72239b30933e9fc1fe7fd40be64c36f))

### [0.5.5](https://github.com/programinglive/todo/compare/v0.5.4...v0.5.5) (2025-10-27)


### ✨ Features

* add artisan command to test Pusher connection ([efd3bf1](https://github.com/programinglive/todo/commit/efd3bf1ac678673f0ecc42c8a622ac452140d3ab))

### [0.5.4](https://github.com/programinglive/todo/compare/v0.5.3...v0.5.4) (2025-10-27)


### 🐛 Bug Fixes

* resolve WebSocket connection error by using standard Pusher hosts ([ef9d5da](https://github.com/programinglive/todo/commit/ef9d5da98ea02b4bd6f2c7f3afc857634b4187dd))

### [0.5.3](https://github.com/programinglive/todo/compare/v0.5.2...v0.5.3) (2025-10-27)


### 🐛 Bug Fixes

* handle missing WebSocket configuration on production ([96b59a9](https://github.com/programinglive/todo/commit/96b59a96981863c3d7b24580fb03b493418e5bb9))

### [0.5.2](https://github.com/programinglive/todo/compare/v0.5.1...v0.5.2) (2025-10-27)


### ✨ Features

* implement real-time live updates for drawing workspace ([a941497](https://github.com/programinglive/todo/commit/a941497caa1c33691288677093747eaf20111e8e))

### [0.5.1](https://github.com/programinglive/todo/compare/v0.4.28...v0.5.1) (2025-10-27)


### 📝 Documentation

* expand drawing workspace documentation ([64c02aa](https://github.com/programinglive/todo/commit/64c02aa0f4847c6b192c905d72e14d453097a379))

### [0.4.28](https://github.com/programinglive/todo/compare/v0.4.27...v0.4.28) (2025-10-27)


### 🐛 Bug Fixes

* infinite loop and passive event listener warnings in drawing editor ([00fd1e4](https://github.com/programinglive/todo/commit/00fd1e49a64dea7966f8443780bcb7cf14bfc543))

### [0.4.27](https://github.com/programinglive/todo/compare/v0.4.26...v0.4.27) (2025-10-27)


### 🧹 Chores

* bump dev workflow server dependency ([beefe47](https://github.com/programinglive/todo/commit/beefe470a514cfdd7ad53dc48dcf7ce53859750f))

### [0.4.26](https://github.com/programinglive/todo/compare/v0.4.25...v0.4.26) (2025-10-26)


### ♻️ Refactors

* unify Create and Edit page headers with sticky z-index and remove duplicate actions ([b22b136](https://github.com/programinglive/todo/commit/b22b136f448cbbcbae2ca5f23ad1fc9c89ed6451))

### [0.4.25](https://github.com/programinglive/todo/compare/v0.4.24...v0.4.25) (2025-10-26)


### ✨ Features

* improve tablet orientation and todos layout ([27caead](https://github.com/programinglive/todo/commit/27caead2f534808ccc34f8505c31616635c5e958))

### [0.4.24](https://github.com/programinglive/todo/compare/v0.4.23...v0.4.24) (2025-10-26)


### 🐛 Bug Fixes

* enable tablet landscape and clean desktop CTA styling ([5fdd54b](https://github.com/programinglive/todo/commit/5fdd54bf6b7adea1a25ba7a1cad601be460bdba6))

### [0.4.23](https://github.com/programinglive/todo/compare/v0.4.22...v0.4.23) (2025-10-26)


### 🐛 Bug Fixes

* add console logging to usePwaMode hook for tablet detection troubleshooting ([ad8cb9d](https://github.com/programinglive/todo/commit/ad8cb9ddda6a0db49e5d75dbbd3c7f01b2dc7be7))

### [0.4.22](https://github.com/programinglive/todo/compare/v0.4.21...v0.4.22) (2025-10-26)


### 🐛 Bug Fixes

* pwa tablet screen size optimization for full-screen display on android tablets and ipads ([fd418e1](https://github.com/programinglive/todo/commit/fd418e1358e7b2b1abddeacaedd88922bd220133))

### [0.4.21](https://github.com/programinglive/todo/compare/v0.4.20...v0.4.21) (2025-10-26)


### 🐛 Bug Fixes

* align Algolia configuration with release ([5eaa923](https://github.com/programinglive/todo/commit/5eaa9236626a993e6eecfe5e497da00f93d08bb8))

### [0.4.20](https://github.com/programinglive/todo/compare/v0.4.19...v0.4.20) (2025-10-26)

### [0.4.19](https://github.com/programinglive/todo/compare/v0.4.18...v0.4.19) (2025-10-26)


### ✨ Features

* add Algolia search integration ([bfff0d1](https://github.com/programinglive/todo/commit/bfff0d11e5baaf4488fc25e1f5724e512deb5693))

### [0.4.18](https://github.com/programinglive/todo/compare/v0.4.17...v0.4.18) (2025-10-26)

### [0.4.17](https://github.com/programinglive/todo/compare/v0.4.16...v0.4.17) (2025-10-26)

### [0.4.16](https://github.com/programinglive/todo/compare/v0.4.15...v0.4.16) (2025-10-26)

### 🐛 Bug Fixes

* polish desktop navbar search alignment and styling for Algolia results
* adjust navbar search pill styling for dark theme contrast
* remove legacy push notification prompt component now handled via profile settings

### [0.4.15](https://github.com/programinglive/todo/compare/v0.4.14...v0.4.15) (2025-10-26)

### [0.4.14](https://github.com/programinglive/todo/compare/v0.4.13...v0.4.14) (2025-10-26)


### 🐛 Bug Fixes

* render todo context inside shadcn drawer ([3444742](https://github.com/programinglive/todo/commit/3444742781f7da204023a180e78acba72f5893b1))
* tighten workspace sidebar layout ([23c623d](https://github.com/programinglive/todo/commit/23c623dd4dd6198ef68271774e6a1cc71907736c))

### [0.4.13](https://github.com/programinglive/todo/compare/v0.4.12...v0.4.13) (2025-10-25)


### 🐛 Bug Fixes

* add logging to notification toggle handler ([bb10d70](https://github.com/programinglive/todo/commit/bb10d702e3ae1048d90b8c8030a2616d33ba9d32))


### ♻️ Refactors

* remove floating push notification banner ([22a04d2](https://github.com/programinglive/todo/commit/22a04d20c86846feeeb7f784a199a9c7db35bd06))


### ✨ Features

* add push notification toggle to profile settings page ([21d8521](https://github.com/programinglive/todo/commit/21d852165910f1fcb7532dcd471c8f02892e2bd1))
* add quick create actions on todo form ([4887671](https://github.com/programinglive/todo/commit/488767104e6ed709de0c9b066819037ea1953f06))

### [0.4.12](https://github.com/programinglive/todo/compare/v0.4.11...v0.4.12) (2025-10-25)


### ✨ Features

* add sentry error reporting and notification toggle to profile settings ([c1f957c](https://github.com/programinglive/todo/commit/c1f957cf4c5b5d2383cbc5a227aa9e7b940a93ef))

### [0.4.11](https://github.com/programinglive/todo/compare/v0.4.10...v0.4.11) (2025-10-25)


### 🐛 Bug Fixes

* send csrf header when storing push subscription ([45d3fd1](https://github.com/programinglive/todo/commit/45d3fd1c31515847dda560338d74fb8298fdb202))

### [0.4.10](https://github.com/programinglive/todo/compare/v0.4.9...v0.4.10) (2025-10-25)


### 🐛 Bug Fixes

* ensure unsubscribe clears state when subscription missing ([da9254f](https://github.com/programinglive/todo/commit/da9254f3e30cf603aaee498e88170df331a1a89e))


### ✨ Features

* keep notification banner visible for management ([d94710f](https://github.com/programinglive/todo/commit/d94710f0e88912101962e9dfefcc9d03a86224c8))
* surface manage button when banner hidden ([505e6ac](https://github.com/programinglive/todo/commit/505e6ac1d4e77040d66f556635ed8fef4a2bef0d))

### [0.4.9](https://github.com/programinglive/todo/compare/v0.4.8...v0.4.9) (2025-10-25)


### 🐛 Bug Fixes

* auto-subscribe after permission granted ([e7519a9](https://github.com/programinglive/todo/commit/e7519a942b89bbb3ae1359f29a196a73bd551fbf))

### [0.4.8](https://github.com/programinglive/todo/compare/v0.4.7...v0.4.8) (2025-10-25)


### 🧹 Chores

* reduce push hook logging ([e34f1d3](https://github.com/programinglive/todo/commit/e34f1d3fbf223e1f9f935a32f3730dc740eb43eb))

### [0.4.7](https://github.com/programinglive/todo/compare/v0.4.6...v0.4.7) (2025-10-25)


### 🐛 Bug Fixes

* allow reopening push notification prompt after dismissal ([8e6f6db](https://github.com/programinglive/todo/commit/8e6f6db00b89ad92afff08dc7b84d13074df72c5))

### [0.4.6](https://github.com/programinglive/todo/compare/v0.4.5...v0.4.6) (2025-10-25)


### 🐛 Bug Fixes

* ensure dismissed push notification prompt stays hidden ([2fd2f3e](https://github.com/programinglive/todo/commit/2fd2f3e81415285cbd3e832843e6587b0a696b95))

### [0.4.5](https://github.com/programinglive/todo/compare/v0.4.4...v0.4.5) (2025-10-25)


### 🐛 Bug Fixes

* show notification prompt after permission granted, even if previously dismissed ([7850301](https://github.com/programinglive/todo/commit/7850301bb078419660bddf012add3b4e1bce8f60))

### [0.4.4](https://github.com/programinglive/todo/compare/v0.4.3...v0.4.4) (2025-10-25)


### ✨ Features

* send push notification when todo is created ([211458d](https://github.com/programinglive/todo/commit/211458d5f7e3a1a294dcf3ced879669da69c0e09))


### 🐛 Bug Fixes

* add CSRF token to FormData for todo creation on production ([8ba66f0](https://github.com/programinglive/todo/commit/8ba66f0344a11f19bc712d0bdff9db35fbc0cfe4))
* persist hidden state for push notification prompt ([7dcb819](https://github.com/programinglive/todo/commit/7dcb819e53ce2ced29cc3deaadf4b3fe6e8f5c26))


### ✅ Tests

* add console logging to push notification prompt visibility ([0930907](https://github.com/programinglive/todo/commit/09309077b33f4607a50b62aeeccc02e8142910ff))

### [0.4.3](https://github.com/programinglive/todo/compare/v0.4.2...v0.4.3) (2025-10-25)


### 🐛 Bug Fixes

* restore web push notifications with custom service worker and session-auth routes ([9c9451c](https://github.com/programinglive/todo/commit/9c9451ce70a893929869570fda65a3cb6d0db6af))

### [0.4.3](https://github.com/programinglive/todo/compare/v0.4.2...v0.4.3) (2025-10-26)

### 🐛 Bug Fixes

* restore web push notifications by deploying custom service worker with injectManifest, routing requests through session-auth endpoints, and ensuring axios sends cookies.

### ✅ Tests

* cover push subscription subscribe/unsubscribe flows and guest authorization.

### [0.4.2](https://github.com/programinglive/todo/compare/v0.4.1...v0.4.2) (2025-10-25)


### 🐛 Bug Fixes

* use inertia router for logout ([5e1f0d7](https://github.com/programinglive/todo/commit/5e1f0d718160dcc9c13349681fd1dfa915eaa5a4))

### [0.4.1](https://github.com/programinglive/todo/compare/v0.4.0...v0.4.1) (2025-10-25)


### 📝 Documentation

* add pwa install guidance ([184a851](https://github.com/programinglive/todo/commit/184a851164462e3dbc3a25e50f56ddf2a377acf9))

## [0.4.0](https://github.com/programinglive/todo/compare/v0.3.35...v0.4.0) (2025-10-25)


### 🐛 Bug Fixes

* guide ios users for pwa install ([e6347d6](https://github.com/programinglive/todo/commit/e6347d667c6b3be522ee04d45340b7623a1fa3fa))

### [0.3.35](https://github.com/programinglive/todo/compare/v0.3.34...v0.3.35) (2025-10-25)


### ✨ Features

* add pwa install prompt ([b1c257b](https://github.com/programinglive/todo/commit/b1c257ba06249df8e1462a0b318d5752cb543359))

### [0.3.34](https://github.com/programinglive/todo/compare/v0.3.33...v0.3.34) (2025-10-25)


### ⚡ Performance

* improve pwa performance ([a53677b](https://github.com/programinglive/todo/commit/a53677b276b1a8befa776c37b119236ada621ff7))

### [0.3.33](https://github.com/programinglive/todo/compare/v0.3.32...v0.3.33) (2025-10-25)


### 🧹 Chores

* redirect todo flows to dashboard ([cc4572d](https://github.com/programinglive/todo/commit/cc4572d40da1ea6e090fa8ec692d5203e8ba0f0c))

### [0.3.32](https://github.com/programinglive/todo/compare/v0.3.31...v0.3.32) (2025-10-25)


### ✨ Features

* show checklist progress on todo detail ([b7ce298](https://github.com/programinglive/todo/commit/b7ce298f106fe4a396c8b1b308bf33d9a42a5b93))

### [0.3.31](https://github.com/programinglive/todo/compare/v0.3.30...v0.3.31) (2025-10-25)


### ♻️ Refactors

* streamline todo detail actions ([d5e2e73](https://github.com/programinglive/todo/commit/d5e2e739051829a203013c5bdf9b6bfa976b2b5b))

### [0.3.30](https://github.com/programinglive/todo/compare/v0.3.29...v0.3.30) (2025-10-25)


### ✨ Features

* unify dashboard workspace panel ([bea401b](https://github.com/programinglive/todo/commit/bea401b8e544ab5f6b3525bb88caa45cacefce1a))

### [0.3.29](https://github.com/programinglive/todo/compare/v0.3.28...v0.3.29) (2025-10-25)


### 🧹 Chores

* simplify dashboard sidebar ([5cb2074](https://github.com/programinglive/todo/commit/5cb207485cf716daf91983894cdc991d0cf59eda))

### [0.3.28](https://github.com/programinglive/todo/compare/v0.3.27...v0.3.28) (2025-10-25)

### [0.3.27](https://github.com/programinglive/todo/compare/v0.3.26...v0.3.27) (2025-10-25)


### ✨ Features

* split todos and notes views ([5cc6096](https://github.com/programinglive/todo/commit/5cc6096e10e84068447ea1fdf0762ef5fd2c75bd))

### [0.3.26](https://github.com/programinglive/todo/compare/v0.3.25...v0.3.26) (2025-10-25)


### 🐛 Bug Fixes

* polish manage tags mobile layout ([6fef69d](https://github.com/programinglive/todo/commit/6fef69d262e3fa0771234d4c439a50e0623c412f))

### [0.3.25](https://github.com/programinglive/todo/compare/v0.3.24...v0.3.25) (2025-10-25)


### 🐛 Bug Fixes

* restore workspace preference toggles ([e843755](https://github.com/programinglive/todo/commit/e843755d47c11d0fc60bb323ce013dfb4d2e05b8))

### [0.3.24](https://github.com/programinglive/todo/compare/v0.3.23...v0.3.24) (2025-10-25)


### 🐛 Bug Fixes

* streamline todos list on mobile ([384edc4](https://github.com/programinglive/todo/commit/384edc444506b82528d82e1e250505a1bcc2a1b3))

### [0.3.23](https://github.com/programinglive/todo/compare/v0.3.22...v0.3.23) (2025-10-25)


### 🐛 Bug Fixes

* polish mobile todo forms ([a11b07f](https://github.com/programinglive/todo/commit/a11b07f4b5af25efe70698c19c01e424e8e88c44))

### [0.3.22](https://github.com/programinglive/todo/compare/v0.3.21...v0.3.22) (2025-10-25)


### 🧹 Chores

* add workspace preference artifacts ([74c68b2](https://github.com/programinglive/todo/commit/74c68b2449a3d66c2a215cf6290fc8073f3649d9))


### 🐛 Bug Fixes

* drop dashboard summary bar ([a8ba695](https://github.com/programinglive/todo/commit/a8ba695a283c8df243992dc6552e3ed41c72374c))
* polish mobile dashboard layout ([a2525d4](https://github.com/programinglive/todo/commit/a2525d4a319fec2cf34ac3a243e15d53a597dd66))

### [0.3.21](https://github.com/programinglive/todo/compare/v0.3.20...v0.3.21) (2025-10-25)


### 🧹 Chores

* ignore workflow state and update dashboard layout ([4129b50](https://github.com/programinglive/todo/commit/4129b507ee5e2db2d57ae33ad668cc7ed0add6e2))


### 🐛 Bug Fixes

* ensure dashboard stats bar layout ([201cafc](https://github.com/programinglive/todo/commit/201cafc0b401de3b2ffe9fff84429d911af41416))
* remove workspace selector ui ([258a30f](https://github.com/programinglive/todo/commit/258a30f62708be0a48eff3f0abf0d148c8787103))

### [0.3.20](https://github.com/programinglive/todo/compare/v0.3.19...v0.3.20) (2025-10-25)


### 🐛 Bug Fixes

* adjust dashboard responsive layout ([b29c8ba](https://github.com/programinglive/todo/commit/b29c8bafe6bc7421d1ea3268b391fc89a4290334))

### [0.3.19](https://github.com/programinglive/todo/compare/v0.3.18...v0.3.19) (2025-10-25)

### [0.3.18](https://github.com/programinglive/todo/compare/v0.3.17...v0.3.18) (2025-10-24)


### 💄 Styles

* **scrollbar:** apply slim scrollbar styling ([8162217](https://github.com/programinglive/todo/commit/8162217047be3838b940066e6ca0deef7e41fa30))

### [0.3.17](https://github.com/programinglive/todo/compare/v0.3.16...v0.3.17) (2025-10-24)


### ♻️ Refactors

* **dashboard:** improve responsive layout and stats grid ([940c875](https://github.com/programinglive/todo/commit/940c8755cf56c2be639fb457a3dfd471b6289f34))

### [0.3.16](https://github.com/programinglive/todo/compare/v0.3.15...v0.3.16) (2025-10-24)


### 🐛 Bug Fixes

* **attachments:** improve delete flow and gcs thumbnails ([65b84fb](https://github.com/programinglive/todo/commit/65b84fb1316cfedae3dd2c2f8773328eafbc70e1))
* **attachments:** simplify delete modal and improve thumbnail generation ([f75ed00](https://github.com/programinglive/todo/commit/f75ed001de1c6eec87205644553d308f2453751e))

### [0.3.15](https://github.com/programinglive/todo/compare/v0.3.14...v0.3.15) (2025-10-24)


### 🐛 Bug Fixes

* **attachments:** handle disks without url support ([74496be](https://github.com/programinglive/todo/commit/74496be298cd03bcec7b6ee29b77b3838b985294))

### [0.3.14](https://github.com/programinglive/todo/compare/v0.3.13...v0.3.14) (2025-10-24)


### 🧹 Chores

* enforce future due dates and polish calendar ([554ecaa](https://github.com/programinglive/todo/commit/554ecaa6405088e5a737e7845f51236ffe11ee9a))

### [0.3.13](https://github.com/programinglive/todo/compare/v0.3.12...v0.3.13) (2025-10-24)


### ✨ Features

* add due date scheduling for todos ([17b6211](https://github.com/programinglive/todo/commit/17b62112a31123b2d2a5bc9a920d61c49a4512c7))
* polish dashboard summaries ([e3fede2](https://github.com/programinglive/todo/commit/e3fede28822cbf299b2389d96504a12d4629d743))

### [0.3.12](https://github.com/programinglive/todo/compare/v0.3.11...v0.3.12) (2025-10-24)

### [0.3.11](https://github.com/programinglive/todo/compare/v0.3.10...v0.3.11) (2025-10-24)


### 🐛 Bug Fixes

* show todos in dashboard sidebar ([281d773](https://github.com/programinglive/todo/commit/281d773ad16755652cccf7957332843c870077be))

### [0.3.10](https://github.com/programinglive/todo/compare/v0.3.8...v0.3.10) (2025-10-24)

### [0.3.9](https://github.com/programinglive/todo/compare/v0.3.8...v0.3.9) (2025-10-24)

### [0.3.8](https://github.com/programinglive/todo/compare/v0.3.7...v0.3.8) (2025-10-24)


### 🐛 Bug Fixes

* support gcs uploads under ubla ([5e12a4e](https://github.com/programinglive/todo/commit/5e12a4e489d73392e3518aeede17ddb97d6b020c))

### [0.3.7](https://github.com/programinglive/todo/compare/v0.3.6...v0.3.7) (2025-10-23)


### 🧹 Chores

* add sqlite testing environment ([982f878](https://github.com/programinglive/todo/commit/982f87898e6dd9a9910a624ad38af46a7eec32ef))


### 🐛 Bug Fixes

* stabilize migrations and seed demo notes ([9ba4c93](https://github.com/programinglive/todo/commit/9ba4c93aa257287a2cb88ce5684fb2c754329ec1))


### 💄 Styles

* refine home hero mobile layout ([ec5a619](https://github.com/programinglive/todo/commit/ec5a61987f8203821aa1975bdac3478d6812eff6))

### [0.3.6](https://github.com/programinglive/todo/compare/v0.3.5...v0.3.6) (2025-10-23)


### 🐛 Bug Fixes

* align todo update validation with matrix enums ([17cd78c](https://github.com/programinglive/todo/commit/17cd78c88dc54aca30bb451e4832f5caa87ac39f))

### [0.3.5](https://github.com/programinglive/todo/compare/v0.3.4...v0.3.5) (2025-10-23)


### 🐛 Bug Fixes

* **api:** clear priority when completing via api ([4fcd5e1](https://github.com/programinglive/todo/commit/4fcd5e1d2fa98d75fb8d90a699bec2091a8c5345))


### ✨ Features

* **todo:** align priority selector with eisenhower matrix ([b90039c](https://github.com/programinglive/todo/commit/b90039cda00887e78a14ab9e44442eb46db0f811))

### [0.3.4](https://github.com/programinglive/todo/compare/v0.3.3...v0.3.4) (2025-10-23)


### 🐛 Bug Fixes

* make eisenhower migration drop legacy constraints ([2f4bc3b](https://github.com/programinglive/todo/commit/2f4bc3be869f0884689f8dbfc1523b0e167ff07c))

### [0.3.3](https://github.com/programinglive/todo/compare/v0.3.2...v0.3.3) (2025-10-23)


### ♻️ Refactors

* align dashboard and tests with Eisenhower metrics ([7591445](https://github.com/programinglive/todo/commit/7591445dd2e9ad0a2a7071be37e77de29fb208a3))
* implement Eisenhower Matrix for todo prioritization ([fdc13bc](https://github.com/programinglive/todo/commit/fdc13bccbb454e7c0e14b6c80945ad930a836d7b))

### [0.3.2](https://github.com/programinglive/todo/compare/v0.3.1...v0.3.2) (2025-10-22)


### 🧹 Chores

* align zettly editor styling ([d6391ae](https://github.com/programinglive/todo/commit/d6391aea99c259eb6d9b6c62e0c6e88c942240af))


### 🐛 Bug Fixes

* **editor:** restore light toolbar active colors ([192d7ec](https://github.com/programinglive/todo/commit/192d7ec4b783b2ce2604ba83c371c24d197c993d))

### [0.3.1](https://github.com/programinglive/todo/compare/v0.3.0...v0.3.1) (2025-10-22)


### 📝 Documentation

* credit zettly editor ([c94794a](https://github.com/programinglive/todo/commit/c94794ae14db078334a5e09679bcde5bb5595ec4))


### ✨ Features

* refresh landing CTA and developer section ([fb31ce2](https://github.com/programinglive/todo/commit/fb31ce26113c5fae112bf5894d545fa61b786436))
* refresh marketing CTA layout ([314892d](https://github.com/programinglive/todo/commit/314892d772f805582fd07c75d907a428e78658cf))
* streamline landing cta ([d449eeb](https://github.com/programinglive/todo/commit/d449eeb0cf003ed3ce22f91b4bdf063d95d28d9c))

## [0.3.0](https://github.com/programinglive/todo/compare/v0.2.16...v0.3.0) (2025-10-22)


### ✨ Features

* merge zettelkasten dashboard with eisenhower matrix ([f08d71a](https://github.com/programinglive/todo/commit/f08d71a811293a5d12d9fd0660ad93d63a5ae751))


### 📝 Documentation

* add open source governance files ([08dcb55](https://github.com/programinglive/todo/commit/08dcb55a5d7145c3c12e29b6d27aaeac26635dce))


### 💄 Styles

* adjust kanban board layout ([fd964ec](https://github.com/programinglive/todo/commit/fd964ecd13233cefe6c6e8f05ce8eb91c782eb7a))
* widen dashboard side panels and update contact emails ([0cd9e14](https://github.com/programinglive/todo/commit/0cd9e14757883164a03ed560cc58fa21ef56a0fc))

### [0.2.16](https://github.com/programinglive/todo/compare/v0.2.15...v0.2.16) (2025-10-22)


### ✨ Features

* paginate archived todos ([657f160](https://github.com/programinglive/todo/commit/657f160568f33dc7f73683ba8c1c22ac9b6b645c))

### [0.2.15](https://github.com/programinglive/todo/compare/v0.2.14...v0.2.15) (2025-10-22)


### ✨ Features

* rebrand app to Zettly and show version in footer ([4f8f0c7](https://github.com/programinglive/todo/commit/4f8f0c762af0545aacbedcdb47c7b30dec8d18d7))

### [0.2.14](https://github.com/programinglive/todo/compare/v0.2.13...v0.2.14) (2025-10-22)


### 🐛 Bug Fixes

* guard profile token toggles ([d9aa316](https://github.com/programinglive/todo/commit/d9aa316fc22354541185de3c4edfc645cca67da2))

### [0.2.13](https://github.com/programinglive/todo/compare/v0.2.12...v0.2.13) (2025-10-22)


### 🐛 Bug Fixes

* define token removal handler on profile page ([59c409a](https://github.com/programinglive/todo/commit/59c409acbb0b534fea6647501dedbd52965ec075))

### [0.2.12](https://github.com/programinglive/todo/compare/v0.2.11...v0.2.12) (2025-10-22)


### 🐛 Bug Fixes

* resolve CSRF token issues and auth errors ([05b2c63](https://github.com/programinglive/todo/commit/05b2c6300cf8b0ffc313509790b0d4d465ecdaab))


### ✨ Features

* refresh layouts with dedicated public navbar ([451118a](https://github.com/programinglive/todo/commit/451118ae683c7e31973095267c9f4c03e5edbfe9))

### [0.2.11](https://github.com/programinglive/todo/compare/v0.2.10...v0.2.11) (2025-10-21)


### 🐛 Bug Fixes

* harden todos filtering and add coverage ([051729a](https://github.com/programinglive/todo/commit/051729a649dc5a7dfffe55cd39ad7d4cb703cb48))

### [0.2.10](https://github.com/programinglive/todo/compare/v0.2.9...v0.2.10) (2025-10-21)


### ✅ Tests

* ensure dashboard todos sorted for kanban ([fa6f7ca](https://github.com/programinglive/todo/commit/fa6f7ca00d3c19dd82dee07ca15376847ca624f1))

### [0.2.9](https://github.com/programinglive/todo/compare/v0.2.8...v0.2.9) (2025-10-21)


### 🐛 Bug Fixes

* drop priority on completed todos ([07ab19a](https://github.com/programinglive/todo/commit/07ab19a557929b5ca60849ee1e2edc99e00ad5a7))
* hide task controls for notes ([f4f6c64](https://github.com/programinglive/todo/commit/f4f6c64cdf319f0ce836479dad3e296639c5762b))

### [0.2.8](https://github.com/programinglive/todo/compare/v0.2.7...v0.2.8) (2025-10-20)


### ✨ Features

* paginate todos and notes with lazy load ([4ee03a2](https://github.com/programinglive/todo/commit/4ee03a24f4ee1b1e7e6e43621e220e4fb66fe588))


### ✅ Tests

* cover todos pagination ([4833d4d](https://github.com/programinglive/todo/commit/4833d4d301090db52488e58cb61cbbb9df44cb79))

### [0.2.7](https://github.com/programinglive/todo/compare/v0.2.6...v0.2.7) (2025-10-20)

### [0.2.6](https://github.com/programinglive/todo/compare/v0.2.5...v0.2.6) (2025-10-20)


### 🏗️ Build System

* use programmatic vite build to avoid cli parse issue ([b7611f4](https://github.com/programinglive/todo/commit/b7611f494f5784a04f0c04e1d9699bbe3a2f4481))

### [0.2.5](https://github.com/programinglive/todo/compare/v0.2.4...v0.2.5) (2025-10-20)


### 🐛 Bug Fixes

* **ui:** apply plain-text preview to dashboard kanban cards ([2af6011](https://github.com/programinglive/todo/commit/2af6011e91b25c0b7dda679c703f77d5b97c3ca0))

### [0.2.4](https://github.com/programinglive/todo/compare/v0.2.3...v0.2.4) (2025-10-20)


### 🧹 Chores

* align tag styling ([1ec4db3](https://github.com/programinglive/todo/commit/1ec4db32da5bc608a00399398b940abe81171050))
* enhance dark mode experience ([a3d8bf7](https://github.com/programinglive/todo/commit/a3d8bf7b710ab68864e49093c0761a628aab3aae))


### ✨ Features

* **ui:** add sanitized HTML rendering with syntax highlighting ([b8f0272](https://github.com/programinglive/todo/commit/b8f0272828f4f116b79da53dca645a90053f1b78))

### [0.2.3](https://github.com/programinglive/todo/compare/v0.2.1...v0.2.3) (2025-10-20)


### 🧹 Chores

* **ci:** disable husky prepare script for production installs ([06499c2](https://github.com/programinglive/todo/commit/06499c256bf9c50598aecade569ce0cc20213593))
* **release:** 0.2.2 🚀 ([804813d](https://github.com/programinglive/todo/commit/804813dc2922dd720411ea978d6473287da131c1))
* remove deprecated husky prepare script ([b9256d5](https://github.com/programinglive/todo/commit/b9256d570b1d8a972356de5969d3d14b532e43cf))
* **tooling:** integrate commiter release workflow ([24ab80c](https://github.com/programinglive/todo/commit/24ab80cb7b92bcd9504c47aa6f1636216c0b24d5))

### [0.2.2](https://github.com/programinglive/todo/compare/v0.2.1...v0.2.2) (2025-10-20)


### 🧹 Chores

* remove deprecated husky prepare script ([b9256d5](https://github.com/programinglive/todo/commit/b9256d570b1d8a972356de5969d3d14b532e43cf))
* **tooling:** integrate commiter release workflow ([24ab80c](https://github.com/programinglive/todo/commit/24ab80cb7b92bcd9504c47aa6f1636216c0b24d5))

### [0.2.1](https://github.com/programinglive/todo/compare/v0.2.0...v0.2.1) (2025-10-20)


### 🔧 Maintenance

* enable lazy-loaded pages to reduce chunk size ([cd9225d](https://github.com/programinglive/todo/commit/cd9225d37e55b646095406db34ecf9a2351978c0))

## [0.2.0](https://github.com/programinglive/todo/compare/v0.1.22...v0.2.0) (2025-10-20)


### ✨ Features

* refresh dashboard stats cards and seed tag demo data ([ab05447](https://github.com/programinglive/todo/commit/ab05447342efd509067b08c5d049ba0ed3aa1123))

### [0.1.22](https://github.com/programinglive/todo/compare/v0.1.21...v0.1.22) (2025-10-20)


### ✨ Features

* **editor:** add local debug toggle logging ([339f621](https://github.com/programinglive/todo/commit/339f621ea342f46cf10bf71d948da14678098422))

### [0.1.21](https://github.com/programinglive/todo/compare/v0.1.20...v0.1.21) (2025-10-19)


### 🐛 Bug Fixes

* **gemini:** handle timeout errors and switch to gemini-2.0-flash model ([c52f806](https://github.com/programinglive/todo/commit/c52f8062085a7a4a54137b2d041e8be892410c38))


### 🔧 Maintenance

* **deps:** update zettly-editor styles import ([e3c50f0](https://github.com/programinglive/todo/commit/e3c50f09047894dc58506d247f3c34770e76d259))

### [0.1.20](https://github.com/programinglive/todo/compare/v0.1.19...v0.1.20) (2025-10-18)


### ✨ Features

* **todos:** add note mode support ([fc51bf7](https://github.com/programinglive/todo/commit/fc51bf7e5a1effa8a0c4ae2cc777d70ef1c81123))

### [0.1.19](https://github.com/programinglive/todo/compare/v0.1.18...v0.1.19) (2025-10-18)

### [0.1.18](https://github.com/programinglive/todo/compare/v0.1.17...v0.1.18) (2025-10-16)


### ✨ Features

* add gemini api and improve todo linking ([042fb72](https://github.com/programinglive/todo/commit/042fb7209c7e6bf8f51e3ff31aaf237d7a8028b4))
* integrate Gemini AI for chat functionality ([aa649e9](https://github.com/programinglive/todo/commit/aa649e917e11ff7298e3f87d917f412cc5233278))

### [0.1.17](https://github.com/programinglive/todo/compare/v0.1.16...v0.1.17) (2025-10-13)


### ✨ Features

* add comprehensive application icons and favicon support ([5be680d](https://github.com/programinglive/todo/commit/5be680d2a5817884f8a3cf1980427c34f66befcc))
* refine dashboard metrics and controller ([22a20e1](https://github.com/programinglive/todo/commit/22a20e1749eb15c489bd6cf5eecd4520a4b4c0e3))

### [0.1.16](https://github.com/programinglive/todo/compare/v0.1.15...v0.1.16) (2025-10-12)


### 🐛 Bug Fixes

* normalize todo priority colors and improve light/dark theme support in show view ([622cb0f](https://github.com/programinglive/todo/commit/622cb0fb3657677ccb14ed298b046e410c850656))

### [0.1.15](https://github.com/programinglive/todo/compare/v0.1.14...v0.1.15) (2025-10-12)


### ✨ Features

* improve checklist ui consistency and dark mode borders ([6a7c878](https://github.com/programinglive/todo/commit/6a7c878ef0562a763ffc08f2308cc4ddf9132a34))

### [0.1.14](https://github.com/programinglive/todo/compare/v0.1.13...v0.1.14) (2025-10-12)


### ✨ Features

* **deps:** integrate opcodesio/log-viewer for enhanced log management and publish assets ([13d1e94](https://github.com/programinglive/todo/commit/13d1e9494a0d0617722cd02ccc3f960f0e0c829b))
* **todo:** sync checklist items in API and web flows ([0037a1c](https://github.com/programinglive/todo/commit/0037a1c02f9e7f77dffb620c34c3fe44a5bcdff1))

### [0.1.13](https://github.com/programinglive/todo/compare/v0.1.12...v0.1.13) (2025-10-09)


### 🐛 Bug Fixes

* **ui:** replace browser confirm() with reusable ConfirmationModal for attachments ([560526c](https://github.com/programinglive/todo/commit/560526c5d34fe49a8f888d5535ed3fa717e212dc))

### [0.1.12](https://github.com/programinglive/todo/compare/v0.1.11...v0.1.12) (2025-10-08)


### ♻️ Code Refactoring

* remove all console statements and fix ProfileTest for soft deletes ([401a9f6](https://github.com/programinglive/todo/commit/401a9f618f2a29f0272881ee53f0987490c32fd6))

### [0.1.11](https://github.com/programinglive/todo/compare/v0.1.10...v0.1.11) (2025-10-08)


### ✨ Features

* add file upload to create and edit forms ([d6457d3](https://github.com/programinglive/todo/commit/d6457d3ded60da5f2e92bbe5c210626a4a8c43c9))

### [0.1.10](https://github.com/programinglive/todo/compare/v0.1.9...v0.1.10) (2025-10-08)


### ♻️ Code Refactoring

* remove relationship type dropdown from todo linking UI ([f061d18](https://github.com/programinglive/todo/commit/f061d18bd6b58819e702334bbaf178ca070334fc))

### [0.1.9](https://github.com/programinglive/todo/compare/v0.1.8...v0.1.9) (2025-10-08)


### ♻️ Code Refactoring

* remove relationship type from todo relationships ([cae4e31](https://github.com/programinglive/todo/commit/cae4e31e3e972bfdaab96bd65129b76dd6045c50))

### [0.1.8](https://github.com/programinglive/todo/compare/v0.1.7...v0.1.8) (2025-10-08)


### ✨ Features

* implement archived flag system and archived todos page ([018e1ed](https://github.com/programinglive/todo/commit/018e1edeee89e28a0b0152b1ba90e27756d2191d))

### [0.1.7](https://github.com/programinglive/todo/compare/v0.1.6...v0.1.7) (2025-10-08)


### ♻️ Code Refactoring

* replace browser confirm with reusable ConfirmationModal ([d603458](https://github.com/programinglive/todo/commit/d6034583cae63712f8bb1425c31e862ececd08f5))

### [0.1.6](https://github.com/programinglive/todo/compare/v0.1.5...v0.1.6) (2025-10-08)


### ✨ Features

* implement archive functionality for completed todos ([4026504](https://github.com/programinglive/todo/commit/4026504146a19b214a8310a8660fef2789dc6eb8))

### [0.1.5](https://github.com/programinglive/todo/compare/v0.1.4...v0.1.5) (2025-10-08)


### ✨ Features

* remove priority when task is completed ([6f15b16](https://github.com/programinglive/todo/commit/6f15b16af04ea546cb66b9ad2b8558289eb4d6e7))

### [0.1.4](https://github.com/programinglive/todo/compare/v0.1.3...v0.1.4) (2025-10-08)


### ♻️ Code Refactoring

* clean up console logs and improve tag display ([9d30ed1](https://github.com/programinglive/todo/commit/9d30ed11a374393c029318c8275885d7f620e713))

### [0.1.3](https://github.com/programinglive/todo/compare/v0.1.1...v0.1.3) (2025-10-08)


### ✨ Features

* implement complete drag and drop functionality ([cbb5c81](https://github.com/programinglive/todo/commit/cbb5c810e48a7839dd03193d7bb8c659fefb2e68))

### [0.1.2](https://github.com/programinglive/todo/compare/v0.1.1...v0.1.2) (2025-10-08)

### [0.1.1](https://github.com/programinglive/todo/compare/v0.1.0...v0.1.1) (2025-10-08)


### 📚 Documentation

* update developer portal with priority system documentation ([b6ff5fc](https://github.com/programinglive/todo/commit/b6ff5fc43b9010f1bdf5132646a09212360006c0))


### 🐛 Bug Fixes

* resolve dark mode button styling in modals ([1dad25c](https://github.com/programinglive/todo/commit/1dad25c1d1398762a189529cc9e5b5ca66eabebe))

## [0.1.0](https://github.com/programinglive/todo/compare/v0.0.5...v0.1.0) (2025-10-07)


### ⚠ BREAKING CHANGES

* **priority:** Database schema updated with new priority column

### ✨ Features

* **priority:** implement comprehensive 4-level priority system ([afe52f9](https://github.com/programinglive/todo/commit/afe52f9bc7f5d46c13cacfcf8af75024653afa16))

### [0.0.5](https://github.com/programinglive/todo/compare/v0.0.4...v0.0.5) (2025-10-07)


### ✨ Features

* create TodoSeeder and improve todo layout ([9a35706](https://github.com/programinglive/todo/commit/9a3570668d8b5522c3b5d034d3d3309716a21297))

### [0.0.4](https://github.com/programinglive/todo/compare/v0.0.3...v0.0.4) (2025-10-07)

### [0.0.3](https://github.com/programinglive/todo/compare/v0.0.2...v0.0.3) (2025-10-07)


### 🔧 Maintenance

* fix GitHub Actions workflow YAML syntax ([7b7cf2c](https://github.com/programinglive/todo/commit/7b7cf2cf1c1fd358175e186b5f7275afbc0b92f0))

### [0.0.2](https://github.com/programinglive/todo/compare/v0.0.1...v0.0.2) (2025-10-07)


### 🔧 Maintenance

* add GitHub Actions workflow and release configuration ([686db9d](https://github.com/programinglive/todo/commit/686db9db8ce62c78321246db015c4bedd853eeb3))

### 0.0.1 (2025-10-07)


### Features

* add comprehensive tag editing functionality ([386ab86](https://github.com/programinglive/todo/commit/386ab86ee30f4c83a33b55f7f6d9d0df990adbe5))
* Add dark mode toggle and fix profile page ([d959568](https://github.com/programinglive/todo/commit/d959568122d46d1b6ef911ac2896c57195037afb))
* add footer component, developer page, and legal pages structure ([aa7b71a](https://github.com/programinglive/todo/commit/aa7b71a7e81adbe7468e08b878c4d1ed3b9fec9d))
* add sentry ([3e997dd](https://github.com/programinglive/todo/commit/3e997dd0bd742c6d03e4626f948ab08985a6b491))
* add Terms of Service and Privacy Policy links to footer ([80dc9ce](https://github.com/programinglive/todo/commit/80dc9ce3995c482d47cca8743dce1fc74fdaf08b))
* Add user-specific todos and outstanding card design ([1929d9b](https://github.com/programinglive/todo/commit/1929d9bbffc3d69d7a914ac6ef746ad08349ab04))
* apply monochromatic black/white color scheme ([157abe2](https://github.com/programinglive/todo/commit/157abe204557d0c5d6378e7e982d2db102a19b7e))
* complete tag management and API documentation ([4ca56d4](https://github.com/programinglive/todo/commit/4ca56d4f2ef4431cc4c30120c43557ee3f074f0e))
* complete tag system overhaul ([7088562](https://github.com/programinglive/todo/commit/7088562a937fec832339c07a59d781e214f8ccdc))
* display tags on dashboard recent todos ([068cc1d](https://github.com/programinglive/todo/commit/068cc1dace18d5dcc0a212ac15524403abf6e514))
* enhance homepage layout with contextual CTAs ([65c68f7](https://github.com/programinglive/todo/commit/65c68f79aa0240b1edfcbbd2d679f9f9d0f9c6e4))
* enhance tag management with restore functionality and improved UX ([98b34b6](https://github.com/programinglive/todo/commit/98b34b631755bf7b17c3894b647d9e964b0a69a1))
* implement complete CRUD API with CORS support ([876c97c](https://github.com/programinglive/todo/commit/876c97cf8b3d222ed7ac9cefc104bd0e2ce0e962))
* implement complete tag feature with soft deletes ([c1c939e](https://github.com/programinglive/todo/commit/c1c939e2e14ed15f192c3c8596bc41a22f1a26c6))
* implement comprehensive modal confirmation system ([877a454](https://github.com/programinglive/todo/commit/877a45416f2a58ca813cc7b7170ca82e3e3c9c8a))
* improve tag management system ([ebed380](https://github.com/programinglive/todo/commit/ebed3801e2d7f79f8c5cf7362e0da8de3915fbd4))
* simplify todos layout to clean list view ([7bcb1d4](https://github.com/programinglive/todo/commit/7bcb1d481e56e61e4bcf544c4686af01b0d29597))


### Bug Fixes

* add comprehensive debugging for Inertia page resolution issues ([5b0bf1b](https://github.com/programinglive/todo/commit/5b0bf1b0dac60c5aa98e4907c9461661b26bb93a))
* add missing toggle method to TodoController ([c1ce2b8](https://github.com/programinglive/todo/commit/c1ce2b80597faa2d19299a5749784d7562e42c76))
* configure Laravel 11 API routing and remove unnecessary CORS middleware ([b1d3c83](https://github.com/programinglive/todo/commit/b1d3c837ce46d08647cd8bbfa0e9c48b6c28f967))
* dynamic linked todos on Edit and robust unlink flow\n\n- Edit: show selected linked todos even if not in available list by passing selectedTodosData to TodoSelector\n- TodoSelector: merge availableTodos with selectedTodosData to render selected badges reliably\n- Show: use Inertia router.post for link/unlink and add toggleForm, force reload on success\n- TodoController: unlink removes both directions at DB level; link/unlink return proper web redirects or JSON\n- ConfirmationModal/TodoLinkManager: add explicit confirm handler + debug to ensure onConfirm path triggers ([a59ef74](https://github.com/programinglive/todo/commit/a59ef7433e1872b09ae3727dad63226ed4b0bd6a))
* improve TagEditModal robustness and error handling ([3e52d2a](https://github.com/programinglive/todo/commit/3e52d2abae3242c8340acb26d53bd2829fb90895))
* properly recreate Tags/Index.jsx with correct filename ([78c1ed6](https://github.com/programinglive/todo/commit/78c1ed6a14111ae05b792f78d90a363e25789b83))
* remove Todo API section from footer and update contact email ([7b893a5](https://github.com/programinglive/todo/commit/7b893a53e6fdf6ca7b1dd793542dbe55822cc1f4))
* remove unused CORS middleware ([bc1f29b](https://github.com/programinglive/todo/commit/bc1f29b4d162791b1c8ea3f000d6cd95fba85cde))
* resolve authentication issue in TagSelector component ([6ea7d93](https://github.com/programinglive/todo/commit/6ea7d935b754f04d2b88d392c50789ac9b886b00))
* resolve Tags/Index page filename issue causing production errors ([40f02ae](https://github.com/programinglive/todo/commit/40f02ae3fb6e52c307f2f60186dcef2cddc96304))
* separate web and API tag routes to resolve endpoint conflicts ([dde78d2](https://github.com/programinglive/todo/commit/dde78d2333b683742e7a1427b0b6cc9c6d929ce8))
* sync edit page linked todos ([72fb53f](https://github.com/programinglive/todo/commit/72fb53fb63d9631ea18fd41cddc72135b10ba95b))
* tag creation and deletion for both web and API ([692adef](https://github.com/programinglive/todo/commit/692adefbc34791be158c83d41dd578f4fa1e4d14))
