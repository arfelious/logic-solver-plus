declare module 'logic-solver-plus' {
  type Term = number | string
  const FALSE: Term
  const TRUE: Term
  function isTerm(value: any): value is Term
  function isNameTerm(value: any): value is string
  function isNumTerm(value: any): value is number

  type Operand = Term | Formula
  type Operands = Operand | ArrayOfOperands
  interface ArrayOfOperands extends Array<Operands> {}

  class Solver {
    constructor()
    toNameTerm(term: Term): string
    toNumTerm(term: Term, noCreate?: boolean): number
    getVarNum(name: string, noCreate?: boolean, _createInternals?: boolean): number
    getVarName(num: number): string
    require(...args: Operands[]): void
    requireOptional(formulas: Operand[] | Operand, weights: number[] | number, options?: {requiredRatio?: number}): {isValid: boolean, ratio: number}
    forbid(...args: Operands[]): void
    solve(): Solution | null
    solveAssuming(assumption: Operand): Solution | null
    isDefinite(formula: Operand): boolean
    solveOptional(options?: {method?: "greedy"}): Solution | null
    minimizeWeightedSum(solution: Solution, formulas: Operand[], weights: number[] | number): Solution | null
    maximizeWeightedSum(solution: Solution, formulas: Operand[], weights: number[] | number): Solution | null
    initialize(): Promise<void>
    clone(): Promise<Solver>
  }

  const FormulaSymbol:unique symbol
  interface Formula {
    [FormulaSymbol]:true
  }
  function isFormula(value: any): value is Formula
  function not(operand: Operand): Formula
  function or(...operands: Operands[]): Formula
  function and(...operands: Operands[]): Formula
  function xor(...operands: Operands[]): Formula
  function implies(operand1: Operand, operand2: Operand): Formula
  function equiv(operand1: Operand, operand2: Operand): Formula
  function exactlyOne(...operands: Operands[]): Formula
  function atMostOne(...operands: Operands[]): Formula

  function disablingAssertions<A>(func: () => A): A

  interface Solution {
    getMap(): Record<string, boolean>
    getTrueVars(): string[]
    evaluate(expression: Term | Formula): boolean
    evaluate(expression: Bits): number
    evaluate<R extends string = string, C extends string | number = string | number>(expression: Table<R, C>): Record<R, C>
    getFormula(): Formula
    getWeightedSum(formula: (Operand | Bits)[], weights: number[]): number
    ignoreUnknownVariables(): void
  }

  const BitsSymbol:unique symbol
  class Bits {
    constructor(formulas: Operand[])
    [BitsSymbol]:true
  }
  function isBits(value: any): value is Bits
  function constantBits(wholeNumber: number): Bits
  function variableBits(baseName: string, N: number): Bits
  function equalBits(bits1: Bits, bits2: Bits): Formula
  function lessThan(bits1: Bits, bits2: Bits): Formula
  function lessThanOrEqual(bits1: Bits, bits2: Bits): Formula
  function greaterThan(bits1: Bits, bits2: Bits): Formula
  function greaterThanOrEqual(bits1: Bits, bits2: Bits): Formula
  function sum(...operands: (Operand | Bits)[]): Bits
  function weightedSum(formulas: (Operand | Bits)[], weights: number[] | number): Bits
  function product(...operands: (Operand | Bits)[]): Bits
  function subtract(minuend:(Operand | Bits), subtrahend:(Operand | Bits)): Bits
  function absoluteDifference(minuend: Operand | Bits, subtrahend: Operand | Bits): Bits
  function allDifferent(...operands: (Operand | Bits)[]): Formula

  class Table<R extends string = string, C extends string | number = string | number> {
    constructor(name: string, rows: R[], cols: C[])
    name: string
    rows: R[]
    cols: C[]
    constraints: Formula[]
    get(row: R, col: C): string
    indexOf(row: R): Bits
    row(row: R): string[]
    col(col: C): string[]
    evaluate(solution: Solution): Record<R, C>
    cells: Record<R, Record<C, string>>
  }
  function isTable(value: any): value is Table
  function table<R extends string = string, C extends string | number = string | number>(name: string, rows: R[], cols: C[]): Table<R, C>
}

