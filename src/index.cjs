const Logic = require('./logic.cjs')
const MiniSat = import('./minisat_wrapper.mjs').then(m=>m.default)
Logic.Solver = class Solver extends Logic.Solver {
    _MiniSatConstructor=MiniSat
    initialize(){
        return super.initialize.bind(this)()
    }
}
module.exports = Logic