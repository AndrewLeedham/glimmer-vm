# `Opaque` is now `unknown`

TypeScript no longer requires a custom type -- any uses of `Opaque` must be replaced with `unknown`.

# Import changes

Moved from `@glimmer/runtime` to `@glimmer/interfaces`

- `Cursor`
- `DynamicScope`
- `Arguments` -> `VMArguments`
- `CapturedArguments`
- `VM`
- `TemplateIterator`

Moved from `@glimmer/util` to `@glimmer/interfaces`

- Dict

Moved from `@glimmer/program` to `@glimmer/interfaces`

- `ConstantPool`

# Simpler Program Hydration

Old:

```ts
let heap = new Heap({
  table: serializedHeap.table,
  handle: serializedHeap.handle,
  buffer: bytecode,
});

let resolver = new BytecodeResolver(app, table, meta, prefix);
let constants = new RuntimeConstants(resolver, pool);
let program = new RuntimeProgram(constants, heap);
```

New:

```ts
let artifacts = {
  heap: {
    table: serializedHeap.table,
    handle: serializedHeap.handle,
    buffer: bytecode,
  },
  constants: pool,
};

let program = hydrateProgram(artifacts);
```

# `new CompilableProgram` is now `compilable()`

Old:

```ts
import { CompilableProgram } from '@glimmer/opcode-compiler';

let block = JSON.parse(templateBlock);
let compilable = new CompilableProgram(this.compiler.compiler, {
  block,
  referrer: meta,
  asPartial: false,
});
```

New:

```ts
import { compilable } from '@glimmer/opcode-compiler';

let block = JSON.parse(templateBlock);
let compilable = compilable({
  block,
  referrer: meta,
});
```

# `renderMain` is now `renderAotMain` and `renderJitMain`

## AOT Mode

Old:

```ts
async function getTemplateIterator(
  app: BaseApplication,
  buffer: ArrayBuffer,
  data: BytecodeData,
  env: Environment,
  builder: ElementBuilder,
  scope: DynamicScope,
  self: PathReference<Opaque>
): TemplateIterator {
  let heap = new Heap({ buffer, table: heap.table, handle: heap.handle });

  let resolver = new BytecodeResolver(app, data);
  let constants = new RuntimeConstants(resolver, data.pool);
  let program = new RuntimeProgram(constants, heap);

  return renderMain(program, env, self, scope, builder, mainEntry);
}
```

New:

```ts
async function getTemplateIterator(
  app: BaseApplication,
  buffer: ArrayBuffer,
  data: BytecodeData,
  env: Environment,
  builder: ElementBuilder,
  self: PathReference<Opaque>
): Promise<TemplateIterator> {
  let heap = data.heap;
  let program = hydrateProgram({ buffer, table: heap.table, handle: heap.handle });
  let resolver = new BytecodeResolver(app, data);

  let runtime = {
    env,
    program,
    resolver,
  };

  return renderAotMain(runtime, self, builder, data.mainEntry);
}
```

## JIT Mode

# v0.45.0

* `@glimmer/runtime`
  * Removed `DefaultEnvironment`
  * `RuntimeEnvironmentDelegate` -> `EnvironmentDelegate`
    * `iterable` -> `toIterator`, now returns an `IteratorDelegate`
  * Changed `JitRuntime` creation methods to receive EnvironmentOptions instead
    a `document` object
  * Added `willDestroy` component capability. Should generally be avoided, it's
    just for classic interop.
* `@glimmer/reference`
  * Removed `MapReference`
  * Removed `UpdatableReference`, replaced it with `UpdatableRootReference` and
    `IterationItemReference`
  * Most references now require the `env`
  * Refactor property and root references generally, not a complete rewrite, but
    large enough that embedders should really pay attention to that code and
    will have to rewrite some things.
  * Major changes
* `@glimmer/validator`
  * Simplified `meta` implementation in general. `tagFor` and `dirtyTagFor` have
    changed decently.
  * Added assertions to tags to prevent incorrect usage


