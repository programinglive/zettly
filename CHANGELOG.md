# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
