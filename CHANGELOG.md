# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.2] - 2021-12-21

- Updated sortier to 1.0.1

## [2.0.1] - 2021-12-19

- Fixed 'Command: Sortier Run' resulted in an error

## [2.0.0] - 2021-12-19

- Migrated our sortier dependency from `@snowcoders/sortier` to `sortier`. If you have a local installation, please migrate.
- Fixed running sortier manually on a file that is ignored now sorts the file (because you explicitly requested it to be sorted)
- Now listens to configuration changes so no need to restart VS Code on configuration change
- Error alerts now only happen when running sortier explicitly. Since errors fire only when running explicitly, we show more error messages than we did previously.

## 1.3.1

- Fixed running sortier on save

## 1.3.0

- Updated sortier@3.2.0
- Enabled sortier to run on unsaved files basing it off the language selected via VS Code

## 1.2.7

- Removed node_modules to .vscodeignore due to missing dependency

## 1.2.6

- Updated cosmiconfig@6.0.0
- Updated typescript@3.8.3
- Updated sortier@3.1.1
- Added node_modules to .vscodeignore to reduce output

## 1.2.5

- Updated cosmiconfig@6.0.0
- Updated typescript@3.7.2
- Updated sortier@3.0.1

## 1.2.4

- Upgraded to sortier 3.0.0

## 1.2.3

- Upgraded to sortier 2.6.1 which supports `.sortierignore` files

## 1.2.2

- Upgraded to sortier 2.5.4

## 1.2.1

- Upgraded to sortier 2.5.2

## 1.2.0

- Added vsce as a dev dependency to reduce need of global install
- Upgraded sortier to 2.3.0
  - Adds json support
  - Adds html attribute support

## 1.1.2

- Updated sortier's packaged version

## 1.1.0

- Now loads local version of sortier before defaulting to packaged version

## 1.0.12

- Fixed sortier-vscode not reading local cosmiconfig settings

## 1.0.11

- Upgraded sortier to fix issue with the sorting of Default specifiers

## 1.0.10

- Upgraded sortier to fix issue regarding decorators

## 1.0.2

- Fixed change log

## 1.0.1

- Fixed notification on save of an unsupported file

## 1.0.0

- Initial release
