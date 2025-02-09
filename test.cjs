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
})