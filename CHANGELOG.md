# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
