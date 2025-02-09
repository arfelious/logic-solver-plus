import MiniSat from './minisat_wrapper.mjs'
import Logic from './logic.cjs'
Logic.Solver = class Solver extends Logic.Solver {
    _MiniSatConstructor=MiniSat
    initialize(){
        return super.initialize.bind(this)()
    }
}
export default Logic