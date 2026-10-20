const Logic = require('./index.cjs')
const assert = require('assert')
const {describe, it} = require('node:test')
describe("Logic-solver cjs",()=>{
  it("should find all solutions to the example problem",async ()=>{
    let solver = new Logic.Solver()
    await solver.initialize()
    solver.require(Logic.atMostOne("Alice", "Bob"));
    solver.require(Logic.or("Bob", "Charlie"));
    var solutions = [];
    var curSol;
    while ((curSol = solver.solve())) {
      solutions.push(curSol.getTrueVars());
      solver.forbid(curSol.getFormula());
    }
    let expected = [
      [ 'Bob' ],
      [ 'Bob', 'Charlie' ],
      [ 'Charlie' ],
      [ 'Alice', 'Charlie' ]
    ].sort()
    solutions.sort()
    assert.deepEqual(solutions, expected)
  })
  it("should be able to use .product and .subtract",async ()=>{
    let solver = new Logic.Solver()
    await solver.initialize()
    let numA = Logic.variableBits("a",6)
    let numB = Logic.variableBits("b",6)
    solver.require(Logic.equalBits(Logic.product(numA,numB),Logic.constantBits(48)))
    solver.require(Logic.equalBits(Logic.subtract(numA,numB),Logic.constantBits(2)))
    let solution = solver.solve()
    let valA = solution.evaluate(numA)
    let valB = solution.evaluate(numB)
    assert.equal(valA,8)
    assert.equal(valB,6)
  })
  it("should enforce Logic.allDifferent",async ()=>{
    let solver = new Logic.Solver()
    await solver.initialize()
    let a = Logic.variableBits("a",3)
    let b = Logic.variableBits("b",3)
    let c = Logic.variableBits("c",3)
    solver.require(Logic.lessThan(a, Logic.constantBits(3)))
    solver.require(Logic.lessThan(b, Logic.constantBits(3)))
    solver.require(Logic.lessThan(c, Logic.constantBits(3)))
    solver.require(Logic.allDifferent(a, b, c))
    let count = 0, sol
    while ((sol = solver.solve())) {
      const vals = [a, b, c].map(bit => sol.evaluate(bit))
      assert.equal(new Set(vals).size, vals.length)
      count++
      solver.forbid(sol.getFormula())
    }
    assert.equal(count, 6)
  })
  it("should subtract when the minuend is narrower",async ()=>{
    let solver = new Logic.Solver()
    await solver.initialize()
    let a = Logic.variableBits("a",2) // 2-bit, max 3
    let b = Logic.variableBits("b",4) // 4-bit
    solver.require(Logic.equalBits(a, Logic.constantBits(3)))
    solver.require(Logic.equalBits(b, Logic.constantBits(5)))
    // 3 - 5 = -2, which wraps to 14 mod 16
    solver.require(Logic.equalBits(Logic.subtract(a, b), Logic.constantBits(14)))
    let solution = solver.solve()
    assert.ok(solution)
    assert.equal(solution.evaluate(a), 3)
    assert.equal(solution.evaluate(b), 5)
    // and 3 - 5 must NOT be 0 (narrower-minuend case used to
    // silently return all-zero)
    let solver2 = new Logic.Solver()
    await solver2.initialize()
    let a2 = Logic.variableBits("a",2)
    let b2 = Logic.variableBits("b",4)
    solver2.require(Logic.equalBits(a2, Logic.constantBits(3)))
    solver2.require(Logic.equalBits(b2, Logic.constantBits(5)))
    solver2.require(Logic.equalBits(Logic.subtract(a2, b2), Logic.constantBits(0)))
    assert.equal(solver2.solve(), null)
  })
  it("should compute Logic.absoluteDifference",async ()=>{
    // a >= b case
    let solver = new Logic.Solver()
    await solver.initialize()
    let a = Logic.variableBits("a",4)
    let b = Logic.variableBits("b",4)
    solver.require(Logic.equalBits(a, Logic.constantBits(8)))
    solver.require(Logic.lessThan(b, Logic.constantBits(4)))    // b in [0..3]
    solver.require(Logic.equalBits(Logic.absoluteDifference(a, b), Logic.constantBits(5)))
    let solution = solver.solve()
    assert.ok(solution)
    let va = solution.evaluate(a)
    let vb = solution.evaluate(b)
    assert.equal(va, 8)
    assert.equal(vb, 3)
    assert.equal(Math.abs(va - vb), 5)


    // a < b case
    let solver2 = new Logic.Solver()
    await solver2.initialize()
    let x = Logic.variableBits("x",4)
    let y = Logic.variableBits("y",4)
    solver2.require(Logic.lessThan(x, Logic.constantBits(4)))    // x in [0..3]
    solver2.require(Logic.equalBits(y, Logic.constantBits(8)))
    solver2.require(Logic.equalBits(Logic.absoluteDifference(x, y), Logic.constantBits(5)))
    let solution2 = solver2.solve()
    assert.ok(solution2)
    let vx = solution2.evaluate(x)
    let vy = solution2.evaluate(y)
    assert.equal(vx, 3)
    assert.equal(vy, 8)
    assert.equal(Math.abs(vx - vy), 5)


  })
  it("should determine Logic.Solver#isDefinite",async ()=>{
    let solver = new Logic.Solver()
    await solver.initialize()
    let a = Logic.variableBits("a",3)
    let b = Logic.variableBits("b",3)
    solver.require(Logic.lessThan(a, Logic.constantBits(2)))
    solver.require(Logic.lessThan(b, Logic.constantBits(2)))
    // both a and b may be 0 or 1, so their relative order is not definite
    assert.equal(solver.isDefinite(Logic.lessThan(a, Logic.constantBits(2))), true)
    assert.equal(solver.isDefinite(Logic.greaterThan(a, b)), false)
    assert.equal(solver.isDefinite(Logic.greaterThan(b, a)), false)
    solver.require(Logic.greaterThan(b, a))
    // now a = 0 and b = 1 are forced
    assert.equal(solver.isDefinite(Logic.greaterThan(b, a)), true)
    assert.equal(solver.isDefinite(Logic.lessThan(a, Logic.constantBits(1))), true)
    assert.equal(solver.isDefinite(Logic.lessThan(b, Logic.constantBits(1))), false)
    assert.equal(solver.isDefinite(Logic.lessThan(b, Logic.constantBits(2))), true)
    assert.equal(solver.isDefinite(Logic.FALSE), false)

    // Unsat solver should not vacuously return true; it must also prove sat
    let unsatSolver = new Logic.Solver()
    await unsatSolver.initialize()
    unsatSolver.require(Logic.FALSE)
    assert.equal(unsatSolver.isDefinite("x"), false)
    assert.equal(unsatSolver.isDefinite(Logic.TRUE), false)
    assert.equal(unsatSolver.solve(), null)
    assert.equal(unsatSolver.isDefinite(Logic.TRUE), false)
  })
  it("should enforce Logic.allDifferent with mixed operand types and widths",async ()=>{
    let solver = new Logic.Solver()
    await solver.initialize()
    let a = Logic.variableBits("a", 2) // 0..3
    let b = "bVar"                     // 0..1 boolean term
    let c = Logic.constantBits(2)      // constant 2
    solver.require(Logic.allDifferent(a, b, c))
    // a and b cannot be 2, and a != b
    let count = 0, sol
    while ((sol = solver.solve())) {
      let valA = sol.evaluate(a)
      let valB = sol.evaluate(b) ? 1 : 0
      let valC = sol.evaluate(c)
      assert.notEqual(valA, valB)
      assert.notEqual(valA, valC)
      assert.notEqual(valB, valC)
      count++
      solver.forbid(sol.getFormula())
    }
    // a in {0, 1, 3}, b in {0, 1}, valC = 2
    // if b = 0, a in {1, 3} (2 options)
    // if b = 1, a in {0, 3} (2 options)
    // total solutions = 4
    assert.equal(count, 4)
  })
  it("should support Logic.table relational mappings and evaluate",async ()=>{
    let solver = new Logic.Solver()
    await solver.initialize()
    let table = Logic.table("job", ["Alice", "Bob", "Charlie"], ["Doctor", "Lawyer", "Engineer"])
    solver.require(table.constraints)

    // Cell access check
    assert.equal(table.get("Alice", "Doctor"), "job_Alice_Doctor")
    assert.equal(table.cells.Alice["Doctor"], "job_Alice_Doctor")
    assert.equal(table.row("Alice").length, 3)
    assert.equal(table.col("Doctor").length, 3)

    // Clue 1: Alice is Engineer (index 2)
    solver.require(table.get("Alice", "Engineer"))

    // Clue 2: Everyone has a different job
    solver.require(Logic.allDifferent(["Alice", "Bob", "Charlie"].map(p => table.indexOf(p))))

    // Clue 3: Bob's job index is less than Charlie's job index
    solver.require(Logic.lessThan(table.indexOf("Bob"), table.indexOf("Charlie")))

    let solution = solver.solve()
    assert.ok(solution)

    let result = solution.evaluate(table)
    assert.deepEqual(result, {
      Alice: "Engineer",
      Bob: "Doctor",
      Charlie: "Lawyer"
    })
  })
  it("should support Logic.Solver#clone for speculative branches",async ()=>{
    let solver = new Logic.Solver()
    await solver.initialize()
    let a = Logic.variableBits("a", 3)
    solver.require(Logic.greaterThanOrEqual(a, Logic.constantBits(1)))
    solver.require(Logic.lessThanOrEqual(a, Logic.constantBits(5)))

    // Base solver can find any solution in 1..5
    let baseSol = solver.solve()
    assert.ok(baseSol)

    // Clone and require a == 2
    let branch1 = await solver.clone()
    branch1.require(Logic.equalBits(a, Logic.constantBits(2)))
    let sol1 = branch1.solve()
    assert.ok(sol1)
    assert.equal(sol1.evaluate(a), 2)

    // Clone and require a == 4
    let branch2 = await solver.clone()
    branch2.require(Logic.equalBits(a, Logic.constantBits(4)))
    let sol2 = branch2.solve()
    assert.ok(sol2)
    assert.equal(sol2.evaluate(a), 4)

    // Base solver should still have its original domain (unaffected by branch1 and branch2)
    assert.equal(solver.isDefinite(Logic.equalBits(a, Logic.constantBits(2))), false)
    assert.equal(solver.isDefinite(Logic.equalBits(a, Logic.constantBits(4))), false)
  })
})