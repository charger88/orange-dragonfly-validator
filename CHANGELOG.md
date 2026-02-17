# Changelog

All notable changes to this project will be documented in this file.

## [0.9.0] - 2/17/2026

### Added

- Full TypeScript support with strict type checking and compile-time type inference (`ODVInfer<S>`)
- `parse()` and `safeParse()` functions with strongly-typed return values
- Schema Builder API (`ODVSchemaBuilder`, `ODVPropertyBuilder`) for fluent schema construction
- JSON Schema interoperability (`fromJsonSchema`, `toJsonSchema`)
- Schema validation (`validateSchema`) for runtime schema integrity checks
- New built-in format validators: URL, UUID, phone, IPv4, date, datetime, hex-color
- Structured error entries with machine-readable codes, messages, and contextual parameters
- Dual-format package output (ESM + CommonJS) with TypeScript declarations

### Changed

- Complete library rewrite in TypeScript
- Built-in email format validator is updated
- Renamed exception classes for consistency (`ODVException`, `ODVRulesException`)
- Deprecated `validate()` function in favor of `parse()` / `safeParse()`

## [0.8.0] - 3/2/2023

- New features, such as per-type validation, transformation, etc.

## [0.7.0]

- Initial stable JavaScript release
