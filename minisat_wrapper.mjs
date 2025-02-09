const C_MINISAT = import('./mjs/minisat_static')
class MiniSat {
  _minisat
  hasInitialized = false
  async initialize(){
    if(!this.hasInitialized) {
      this._minisat = await (await C_MINISAT).default()
      this.hasInitialized = true
      this._minisat.__createTheSolver= this._minisat.cwrap('createTheSolver', null, []); // void
      this._minisat.__ensureVar= this._minisat.cwrap('ensureVar', null, ['number']); // void ensureVar(int v)
      this._minisat.__addClause= this._minisat.cwrap('addClause', 'boolean', ['number']); // bool addClause(int *terms)
      this._minisat.__solve= this._minisat.cwrap('solve', 'boolean', []); // bool solve()
      this._minisat.__getSolution= this._minisat.cwrap('getSolution', 'number', []); // uint8_t* getSolution()
      this._minisat.__getNumVars= this._minisat.cwrap('getNumVars', 'number', []); // int getNumVars()
      this._minisat.__solveAssuming= this._minisat.cwrap('solveAssuming', 'boolean', ['number']); // bool solveAssuming(int v)
      this._minisat.__retireVar= this._minisat.cwrap('retireVar', null, ['number']); // void retireVar(int v)
      this._minisat.__solveOptional = this._minisat.cwrap('solveOptional',null, ['number','number']); // bool solveOptional(int v)
      this._minisat.__addOptionalClause = this._minisat.cwrap('addOptionalClause',null, ['number']); // bool addOptionalClause(int *terms)
      this._minisat.__createTheSolver();
    }

  }
  ensureVar(v){
    if(!this.hasInitialized) {
      throw new Error("MiniSat has not been initialized. use await solver.initialize() before calling any other methods")
    }
    this._minisat.__ensureVar(v);
  }
  addClause(terms){
    if(!this.hasInitialized) {
      throw new Error("MiniSat has not been initialized. use await solver.initialize() before calling any other methods")
    }
    this._clauses.push(terms);
    let curr = this;
    return this._native.savingStack(function (native, C) {
      let arr = new Uint8Array((terms.length + 1)*4);
      var termsPtr = curr._minisat.allocate(arr, curr._minisat.ALLOC_STACK);
      terms.forEach(function (t, i) {
          curr._minisat.setValue(termsPtr + i*4, t, 'i32');
      })
      curr._minisat.setValue(termsPtr + terms.length*4, 0, 'i32'); // 0-terminate
      let retVal = curr._minisat.__addClause(termsPtr)
      return retVal ? true : false;
    });
  }
  addOptionalClause(terms){
    if(!this.hasInitialized) {
      throw new Error("MiniSat has not been initialized. use await solver.initialize() before calling any other methods")
    }
    let curr = this;
    return this._native.savingStack(function (native, C) {
      let arr = new Uint8Array((terms.length + 1)*4);
      var termsPtr = curr._minisat.allocate(arr, curr._minisat.ALLOC_STACK);
      terms.forEach(function (t, i) {
          curr._minisat.setValue(termsPtr + i*4, t, 'i32');
      })
      curr._minisat.setValue(termsPtr + terms.length*4, 0, 'i32'); // 0-terminate
      let retVal = curr._minisat.__addOptionalClause(termsPtr)
      return retVal ? true : false;
    })
  }
  solve(){
    if(!this.hasInitialized) {
      throw new Error("MiniSat has not been initialized. use await solver.initialize() before calling any other methods")
    }
    return this._minisat.__solve() ? true : false;
  }
  solveOptional(){
    if(!this.hasInitialized) {
      throw new Error("MiniSat has not been initialized. use await solver.initialize() before calling any other methods")
    }
    let arr1 = new Uint8Array(4);
    let arr2 = new Uint8Array(4);
    const resultPtr = this._minisat.allocate(arr1, this._minisat.ALLOC_STACK);
    const indexPtr = this._minisat.allocate(arr2, this._minisat.ALLOC_STACK);
    this._minisat.__solveOptional(resultPtr,indexPtr);
    const result = this._minisat.getValue(resultPtr, 'i32')!==0;
    const index = this._minisat.getValue(indexPtr, 'i32');
    return {result, index};
  }
  solveAssuming(v){
    if(!this.hasInitialized) {
      throw new Error("MiniSat has not been initialized. use await solver.initialize() before calling any other methods")
    }
    return this._minisat.__solveAssuming(v) ? true : false;
  }
  getSolution(){
    if(!this.hasInitialized) {
      throw new Error("MiniSat has not been initialized. use await solver.initialize() before calling any other methods")
    }
    var solution = [null];
    var C = this._minisat
    var numVars = C.__getNumVars();
    var solPtr = C.__getSolution();
    for (var i = 0; i < numVars; i++) {
      solution[i+1] = (C.getValue(solPtr+i, 'i8') === 0);
    }
    return solution;
  }

  retireVar(v){
    if(!this.hasInitialized) {
      throw new Error("MiniSat has not been initialized. use await solver.initialize() before calling any other methods")
    }
    this._minisat.__retireVar(v);
  }

  constructor() {
    let curr = this;
    this._clauses = [];
    this._native = {
      getStackPointer: function () {
        if(!curr.hasInitialized) {
          throw new Error("MiniSat has not been initialized. use await solver.initialize() before calling any other methods")
        }
        return curr._minisat.stackSave();
      },
      setStackPointer: function (ptr) {
        if(!curr.hasInitialized) {
          throw new Error("MiniSat has not been initialized. use await solver.initialize() before calling any other methods")
        }
        curr._minisat.stackRestore(ptr);
      },
      allocateBytes: function (len) {
        if(!curr.hasInitialized) {
          throw new Error("MiniSat has not been initialized. use await solver.initialize() before calling any other methods")
        }
        return curr._minisat.allocate(len, curr._minisat.ALLOC_STACK);
      },
      pushString: function (str) {
        if(!curr.hasInitialized) {
          throw new Error("MiniSat has not been initialized. use await solver.initialize() before calling any other methods")
        }
        return curr._minisat.allocateBytes(curr._minisat.intArrayFromString(str));
      },
      savingStack: function (func) {
        if(!curr.hasInitialized) {
          throw new Error("MiniSat has not been initialized. use await solver.initialize() before calling any other methods")
        }
        var SP = this.getStackPointer();
        try {
          return func(this, curr._minisat);
        } finally {
          this.setStackPointer(SP);
        }
      }

    }
  }
}
export default MiniSat