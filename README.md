# Logic Solver Plus

**Logic Solver Plus** is a boolean satisfiability (SAT) and constraint solver for JavaScript and TypeScript. Given a problem expressed as logical, arithmetic, or relational constraints on variables, it either provides a valid solution or tells you definitively that no assignment of the variables can satisfy the constraints.

It is a modernized, high-performance fork of Meteor's [`logic-solver`](https://www.npmjs.com/package/logic-solver), embedding an industrial-strength [MiniSat](http://minisat.se/) backend compiled from C++ to **WebAssembly** with TypeScript support.

### Key Improvements over `logic-solver`

- **WebAssembly Engine with Dynamic Memory**: Compiles MiniSat to WASM with `ALLOW_MEMORY_GROWTH`, eliminating out-of-memory crashes on large constraint graphs and delivering ~30% faster execution on complex clause graphs and adder/multiplier trees.
- **Optimized Inequality Circuit (`genLTE`)**: Overhauls the internal comparator used by `lessThan`, `lessThanOrEqual`, `greaterThan`, and `greaterThanOrEqual` to prune redundant intermediate clauses and fold constants to significantly reduce CNF bloat.
- **Relational Domain Tables (`Logic.table`)**: Model 2D entity-attribute mappings, logic grid puzzles, and CSPs with automatic dual one-hot boolean and binary index representations.
- **Extended Bit Arithmetic & Cardinality**: Adds `Logic.product`, `Logic.subtract`, `Logic.absoluteDifference`, and `Logic.allDifferent`.
- **Deduction & Branching (`isDefinite`, `clone`)**: Check whether a formula is proven across all valid solutions without mutating solver state, or asynchronously clone active solvers to explore speculative branches.
- **Soft Constraints / MaxSAT (`requireOptional`, `solveOptional`)**: Solve optimization problems with weighted optional requirements.
- **Universal Module & TypeScript Support**: Works seamlessly with both **ESM** (`import`) and **CommonJS** (`require`), with bundled TypeScript declarations.

---

## Installation & Quick Start

```bash
npm install logic-solver-plus
```

Unlike the original `logic-solver`, the WebAssembly engine must be asynchronously initialized via `await solver.initialize()` before use. Everything else remains backward-compatible.

```js
// ESM
import Logic from 'logic-solver-plus';

// Or CommonJS:
// const Logic = require('logic-solver-plus');

const solver = new Logic.Solver();
await solver.initialize();
```

## Table of Contents

- [Example: Dinner Guests (Boolean Logic)](#example-dinner-guests-boolean-logic)
- [Example: Logic Puzzles with `Logic.table`](#example-logic-puzzles-with-logictable)
- [Variables & Terms](#variables--terms)
- [Formulas](#formulas)
- [Logic.Solver](#logicsolver)
- [Logic.Solution](#logicsolution)
- [Bits (Unsigned Integers)](#bits-unsigned-integers)
- [Relational Tables (`Logic.table`)](#relational-tables-logictable)
- [Optimization & Soft Constraints](#optimization--soft-constraints)
- [Building from Source (`build.sh`)](#building-from-source-buildsh)
- [About MiniSat](#about-minisat)

---

## Example: Dinner Guests (Boolean Logic)

Suppose we want to decide which combination of **Alice**, **Bob**, and **Charlie** to invite to dinner, subject to two rules:
- Don't invite both Alice and Bob
- Invite either Bob or Charlie

```js
import Logic from 'logic-solver-plus';

const solver = new Logic.Solver();
await solver.initialize();

solver.require(Logic.atMostOne("Alice", "Bob"));
solver.require(Logic.or("Bob", "Charlie"));

const sol1 = solver.solve();
sol1.getTrueVars(); // => ["Bob"]
```

What happens if we invite Alice? Using `solveAssuming`, we can query the solver with a temporary assumption without permanently altering our constraints:

```js
const sol2 = solver.solveAssuming("Alice");
sol2.getTrueVars(); // => ["Alice", "Charlie"]
```

Inviting Alice means we can't invite Bob, which forces us to invite Charlie. We can verify that inviting Alice *always* requires inviting Charlie using `isDefinite` (or by checking that the counterexample returns `null`):

```js
solver.isDefinite(Logic.implies("Alice", "Charlie")); // => true
solver.solveAssuming(Logic.and("Alice", "-Charlie")); // => null ("-Charlie" is shorthand for Logic.not("Charlie"))
```

To enumerate **all** possible solutions, we can repeatedly solve and forbid the current solution's exact assignment:

```js
const solutions = [];
let curSol;
while ((curSol = solver.solve())) {
  solutions.push(curSol.getTrueVars());
  solver.forbid(curSol.getFormula());
}

solutions;
// => [["Alice", "Charlie"], ["Charlie"], ["Bob", "Charlie"], ["Bob"]]
```

---

## Example: Logic Puzzles with `Logic.table`

Many constraint problems map entities (rows) to domain values (columns). `Logic.table` automatically creates both one-hot boolean variables (`table.get(row, col)`) for direct facts and binary index bit-vectors (`table.indexOf(row)`) for ordering and arithmetic.

Suppose **Alice**, **Bob**, and **Charlie** live on different floors (**1**, **2**, **3**) and each own a different pet (**Cat**, **Dog**, **Bird**):

```js
import Logic from 'logic-solver-plus';

const solver = new Logic.Solver();
await solver.initialize();

const people = ['Alice', 'Bob', 'Charlie'];
const floor = Logic.table('floor', people, [1, 2, 3]);
const pet = Logic.table('pet', people, ['Cat', 'Dog', 'Bird']);

// Register internal table bounds and cell-to-index linking
solver.require(floor.constraints);
solver.require(pet.constraints);

// Clue 1: Everyone lives on a different floor and owns a different pet
solver.require(Logic.allDifferent(people.map(p => floor.indexOf(p))));
solver.require(Logic.allDifferent(people.map(p => pet.indexOf(p))));

// Clue 2: Alice does not live on the 1st floor
solver.forbid(floor.get('Alice', 1));

// Clue 3: Alice lives on a higher floor than Bob (Alice > Bob)
solver.require(Logic.greaterThan(floor.indexOf('Alice'), floor.indexOf('Bob')));

// Clue 4: Bob lives on the 1st or 2nd floor (column index <= 1)
solver.require(Logic.lessThanOrEqual(floor.indexOf('Bob'), Logic.constantBits(1)));

// Clue 5: The person on the 3rd floor owns the Dog
for (const p of people) {
  solver.require(Logic.equiv(pet.get(p, 'Dog'), floor.get(p, 3)));
}

// Clue 6: Alice owns the Bird
solver.require(pet.get('Alice', 'Bird')); // or solver.require(pet.cells.Alice.Bird)

// Query whether a fact is guaranteed before extracting a full solution
solver.isDefinite(pet.get('Charlie', 'Dog')); // => true

const solution = solver.solve();
solution.evaluate(floor); // => { Alice: 2, Bob: 1, Charlie: 3 }
solution.evaluate(pet);   // => { Alice: 'Bird', Bob: 'Cat', Charlie: 'Dog' }
```

---

## Variables & Terms

Variable names are strings that can contain spaces and punctuation (e.g., `"Alice"`, `"1,2"`, `"it is raining"`). Variable names cannot be empty, consist purely of digits `0-9`, or start with `-` or `$` (reserved for internal solver variables). Variables do not need to be declared ahead of time; they are allocated automatically when first passed to a `Solver`.

A **Term** (or *literal*) is a variable name (`NameTerm`) or internal variable number (`NumTerm`), optionally negated. Prefixing a variable name with `"-"` negates it: `"-A"` is equivalent to `Logic.not("A")`.

### Constants & Helper Methods

| Constant / Method | Description |
| :--- | :--- |
| `Logic.TRUE`, `Logic.FALSE` | Constant boolean Terms (`"$T"` and `"$F"`). |
| `Logic.isTerm(val)` | Returns `true` if `val` is a valid `NameTerm` or `NumTerm`. |
| `Logic.isNameTerm(val)` | Returns `true` if `val` is a string Term (e.g., `"A"`, `"-A"`). |
| `Logic.isNumTerm(val)` | Returns `true` if `val` is a non-zero integer Term (e.g., `5`, `-5`). |
| `solver.getVarNum(name, [noCreate])` | Returns the integer ID for `name` (allocating one unless `noCreate` is `true`, in which case it returns `0`). |
| `solver.getVarName(num)` | Returns the string variable name for an allocated variable number. |
| `solver.toNameTerm(term)` | Converts a `NumTerm` or `NameTerm` to a `NameTerm`. |
| `solver.toNumTerm(term, [noCreate])` | Converts a `NameTerm` or `NumTerm` to a `NumTerm`. |

---

## Formulas

A **Formula** is an immutable, Solver-independent object representing a boolean expression. Because Solvers cache compiled Formulas internally, you should save and reuse Formula objects whenever they appear in multiple constraints.

Constructor functions that accept `operands...` take any number of Formulas, Terms, or arbitrarily nested Arrays (e.g., `Logic.and("A", ["B", "C"])`). To activate a Formula, pass it to `solver.require()` or `solver.forbid()`.

### Formula Constructors

| Method | Description |
| :--- | :--- |
| `Logic.isFormula(val)` | Returns `true` if `val` is a `Formula` object (note: a `Term` is not a `Formula`, though Terms are accepted everywhere Formulas are). |
| `Logic.not(operand)` | True when `operand` is false. Calling `Logic.not("A")` returns `"-A"`; `Logic.not("-A")` returns `"A"`. |
| `Logic.or(operands...)` | True when **at least one** operand is true. |
| `Logic.and(operands...)` | True when **all** operands are true. |
| `Logic.xor(operands...)` | True when an **odd number** of operands are true. |
| `Logic.implies(op1, op2)` | True unless `op1` is true and `op2` is false (`op_1 ⟹ op_2`). |
| `Logic.equiv(op1, op2)` | True when `op1` and `op2` have the same boolean value (`op_1 ⟺ op_2`). |
| `Logic.exactlyOne(operands...)` | True when **exactly one** operand is true. |
| `Logic.atMostOne(operands...)` | True when **zero or one** operand is true. |
| `Logic.allDifferent(operands...)` | True when **every operand has a distinct value** from every other operand. Works with `Bits`, Terms, Formulas, or nested arrays. |

---

## Logic.Solver

Each `Logic.Solver` instance embeds a self-contained WebAssembly MiniSat instance. Solving is fully incremental: constraints are added via `require` and `forbid`, and subsequent `solve()` calls reuse clauses learned during earlier searches.

### Constructor & Core Methods

#### `new Logic.Solver()` & `await solver.initialize()`
Creates a new solver and asynchronously initializes its WebAssembly MiniSat instance. You must `await solver.initialize()` before calling other methods.

#### `solver.require(args...)` / `solver.forbid(args...)`
Permanently requires that all Formulas and Terms in `args` (which may be nested arrays) evaluate to `true` (`require`) or `false` (`forbid`).

#### `solver.solve()`
Finds a satisfying assignment for all required and forbidden constraints, returning a `Logic.Solution` or `null` if the problem is unsatisfiable.

#### `solver.solveAssuming(assumption)`
Like `solve()`, but searches for a solution that temporarily satisfies `assumption` (a Formula or Term). If `solveAssuming` returns `null`, the solver remains usable and no permanent constraints are added.

#### `solver.isDefinite(formula)`
Returns `true` if the current constraint system is satisfiable **and** `formula` is guaranteed to be `true` in *every* valid solution. Non-destructive; leaves the solver's constraint set untouched.

#### `await solver.clone()`
Asynchronously returns an independent `Logic.Solver` instance with an exact copy of the current clauses, variable mappings, and internal MiniSat state. Useful for exploring speculative branches without mutating the base solver:

```js
const branch = await solver.clone();
branch.require("SpeculativeConstraint");
const branchSol = branch.solve(); // Does not affect `solver`
```

#### `Logic.disablingAssertions(func)`
Executes `func()` with runtime argument validation disabled, returning `func()`'s result. Useful for speeding up Formula construction when building thousands of constraints in tight loops.

---

## Logic.Solution

Returned by `solve()`, `solveAssuming()`, `solveOptional()`, `minimizeWeightedSum()`, and `maximizeWeightedSum()`. Represents a concrete assignment of variables.

| Method | Description |
| :--- | :--- |
| `solution.getMap()` | Returns an Object mapping all user variable names to `true` or `false`. |
| `solution.getTrueVars()` | Returns an Array of variable names assigned to `true`. |
| `solution.evaluate(expr)` | Evaluates `expr` under this solution: returns a **Boolean** for a `Formula` or `Term`, an **Integer** for a `Bits` object, or a **`{ [row]: colValue }` Object** for a `Logic.table`. |
| `solution.getFormula()` | Returns a Formula representing this exact variable assignment. Pass to `solver.forbid(solution.getFormula())` to find alternative solutions. |
| `solution.getWeightedSum(formulas, weights)` | Evaluates `Logic.weightedSum(formulas, weights)` directly using fast integer arithmetic within JS. |
| `solution.ignoreUnknownVariables()` | Configures this `Solution` to treat unknown or newly created variables as `false` during `evaluate()` instead of throwing an error. |

---

## Bits (Unsigned Integers)

A `Bits` object represents an N-bit non-negative unsigned integer as an array of boolean Formulas with the least significant bit first. (`bits[0]` is the ones digit, `bits[1]` is twos digit, `bits[2]` is the fours digit etc.). JavaScript numbers are not automatically promoted to `Bits`. If you want to use a constant like 5, you must call `Logic.constantBits(5)` to get a Bits object.

All inequality comparisons (`lessThan`, `lessThanOrEqual`, `greaterThan`, `greaterThanOrEqual`) are powered by an improved `genLTE` circuit that folds constants and prunes redundant comparator clauses.

### Example: Bit Arithmetic & Magic Squares

Finding two 5-bit integers `x > y` where `x ⋅ y = 48` and `x - y = 2`:

```js
const x = Logic.variableBits('x', 5);
const y = Logic.variableBits('y', 5);

solver.require(Logic.equalBits(Logic.product(x, y), Logic.constantBits(48)));
solver.require(Logic.equalBits(Logic.absoluteDifference(x, y), Logic.constantBits(2)));
solver.require(Logic.greaterThan(x, y));

const sol = solver.solve();
sol.evaluate(x); // => 8
sol.evaluate(y); // => 6
```

Or solving a 3x3 Magic Square (digits 1–9, distinct, rows/cols/diagonals summing to 15):

```js
const cells = ['A','B','C','D','E','F','G','H','I'].map(name => Logic.variableBits(name, 4));
const [A, B, C, D, E, F, G, H, I] = cells;
const fifteen = Logic.constantBits(15);

for (const cell of cells) {
  solver.require(Logic.greaterThanOrEqual(cell, Logic.constantBits(1)));
  solver.require(Logic.lessThanOrEqual(cell, Logic.constantBits(9)));
}
solver.require(Logic.allDifferent(cells));

for (const line of [[A,B,C], [D,E,F], [G,H,I], [A,D,G], [B,E,H], [C,F,I], [A,E,I], [G,E,C]]) {
  solver.require(Logic.equalBits(Logic.sum(line), fifteen));
}

const magicSol = solver.solve();
cells.map(c => magicSol.evaluate(c)); // => [6, 7, 2, 1, 5, 9, 8, 3, 4]
```

### `Bits` Reference

| Method | Returns | Description |
| :--- | :--- | :--- |
| `new Logic.Bits(formulas)` | `Bits` | Wraps an array of boolean Formulas/Terms (LSB first). |
| `Logic.isBits(val)` | `Boolean` | Returns `true` if `val` is a `Bits` instance. |
| `Logic.constantBits(num)` | `Bits` | Creates a constant `Bits` for non-negative integer `num`. |
| `Logic.variableBits(name, N)` | `Bits` | Creates an N-bit unsigned integer variable (`0` to `2^N - 1`). |
| `Logic.equalBits(b1, b2)` | `Formula` | True when `b1 == b2`. |
| `Logic.lessThan(b1, b2)` | `Formula` | True when `b1 < b2`. |
| `Logic.lessThanOrEqual(b1, b2)` | `Formula` | True when `b1 <= b2`. |
| `Logic.greaterThan(b1, b2)` | `Formula` | True when `b1 > b2`. |
| `Logic.greaterThanOrEqual(b1, b2)` | `Formula` | True when `b1 >= b2`. |
| `Logic.sum(operands...)` | `Bits` | Sum of `Bits`, Formulas, or Terms (booleans count as `0` or `1`). |
| `Logic.weightedSum(formulas, weights)` | `Bits` | Represents a weighted sum of formulas (`formulas[i] ⋅ weights[i]`) where `weights` can be an Array or a single integer. |
| `Logic.product(operands...)` | `Bits` | Product (multiplication) of all operands. |
| `Logic.subtract(minuend, subtrahend)` | `Bits` | Unsigned difference `minuend - subtrahend` (wraps around on underflow if `minuend < subtrahend`). |
| `Logic.absoluteDifference(a, b)` | `Bits` | Unsigned distance `\|a - b\|` without underflow wrap-around. |

---

## Relational Tables (`Logic.table`)

`Logic.table(name, rows, cols)` creates a 2D domain mapping where each entity in `rows` is assigned a value from `cols`.

```js
const favorite = Logic.table('favorite', ['Alice', 'Bob', 'Charlie'], ['Red', 'Green', 'Blue']);
solver.require(favorite.constraints); // Always require the table's internal constraints!
```

| Property / Method | Description |
| :--- | :--- |
| `Logic.isTable(val)` | Returns `true` if `val` is a `Logic.Table` instance. |
| `table.constraints` | Array of Formulas enforcing domain bounds (`0 .. cols.length - 1`) and two-way linking between one-hot cells and index bits. **Must be passed to `solver.require()`**. |
| `table.cells` | Nested object containing all boolean cell variables, accessible as `table.cells[row][col]` or `table.cells.Alice.Doctor`. |
| `table.get(row, col)` | Returns the boolean cell variable for `(row, col)`. |
| `table.indexOf(row)` | Returns a `Logic.Bits` representing the assigned column index (`0 .. cols.length - 1`) for `row`. Use with `allDifferent`, `lessThan`, `greaterThan`, `absoluteDifference`, etc. |
| `table.row(row)` | Returns the Array of boolean cell variables across all columns for `row`. |
| `table.col(col)` | Returns the Array of boolean cell variables across all rows for `col` (ideal for column cardinality sums, e.g., `Logic.sum(table.col('Red'))`). |
| `table.evaluate(solution)` | Returns `{ [row]: colValue }` (equivalent to `solution.evaluate(table)`). |

---

## Optimization & Soft Constraints

### Weighted-Sum Optimization

Given an initial valid `solution` (from `solve()` or `solveAssuming()`), these methods incrementally tighten inequalities using `solveAssuming` until the global optimum is found, then permanently require that optimum value on the solver:

- **`solver.minimizeWeightedSum(solution, formulas, weights)`** -> `Logic.Solution`
- **`solver.maximizeWeightedSum(solution, formulas, weights)`** -> `Logic.Solution`

Call `optSolution.getWeightedSum(formulas, weights)` on the returned solution to read the optimal integer value.

### Soft Constraints (`requireOptional` / `solveOptional`)

When constraints may conflict and you want to satisfy as many weighted preferences as possible without making the solver unsatisfiable:

- **`solver.requireOptional(formulas, weights, [options])`**
  Registers a group of optional formulas with corresponding numerical `weights` (an array or single number). `options` accepts `{ requiredRatio?: number }` (default `0.9`). Returns a live status object `{ isValid: boolean, ratio: number }` that updates whenever `solveOptional()` runs. Earlier calls to `requireOptional` are prioritized first.
- **`solver.solveOptional([options])`**
  Iterates over optional formula groups in priority order and maximizes satisfied weights (`options` accepts `{ method?: "greedy" }`). Returns a `Logic.Solution` or `null` if the hard constraints (`solver.require`) alone are unsatisfiable.

---

## Building from Source (`build.sh`)

The WebAssembly MiniSat engine can be compiled directly from source using the included `build.sh` script.

### Prerequisites

- [Emscripten SDK (emsdk)](https://emscripten.org/docs/getting_started/downloads.html) configured in your environment (`emmake`, `emcc`).
- Standard build tools (`make`, `patch`, `sed`).

### Build Steps

1. Run `./build.sh` from the repository root:
   ```bash
   ./build.sh
   ```
   *Note: If the `minisat/` directory is not already present, `build.sh` will automatically download and unpack the official [MiniSat 2.2.0](http://minisat.se/downloads/minisat-2.2.0.tar.gz) release. If you manually clone [niklasso/minisat](https://github.com/niklasso/minisat), `build.sh` will automatically detect and flatten the nested `minisat/minisat/` directory.*

This script:
- Patches MiniSat for WebAssembly compatibility.
- Applies `src/solve_string.diff` and copies `src/logic_solver.cc` to add external C-API hooks.
- Compiles MiniSat with dynamic memory growth enabled (`-sALLOW_MEMORY_GROWTH`).
- Copies the modularized ES6 WebAssembly artifacts (`minisat_static` and `minisat_static.wasm`) directly into `src/`.

---

## About MiniSat

[MiniSat](http://minisat.se/) is an industrial-strength Conflict-Driven Clause Learning (CDCL) SAT solver. Logic Solver Plus compiles your high-level boolean, arithmetic, and relational formulas into Conjunctive Normal Form (CNF) clauses and feeds them into a WebAssembly build of MiniSat. When MiniSat encounters a contradiction during search, it analyzes the implication graph, learns a new conflict clause, and backjumps which allows it to prune massive portions of the search space and solve problems with thousands of variables in milliseconds.