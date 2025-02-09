source /etc/profile.d/emscripten.sh
cd minisat/simp
sed -i "s/include/MROOT=..\/\ninclude/"  Makefile
sed -i "s/\"PRI/\" PRI/" *.cc *.h ../utils/*.cc ../utils/*.h
sed -i "s/bool sign = false/bool sign/" ../core/SolverTypes.h
sed -i "s/ (Var var, bool sign)/ (Var var, bool sign = false)/" ../core/SolverTypes.h
sed -i "s/memUsedPeak();/0;/" Main.cc
sed -i "s/using namespace Minisat;/#include <emscripten.h>\nusing namespace Minisat;/" Main.cc
cd ..
cp ../src/solve_string.diff ./solve_string.diff
patch -p2  -N < solve_string.diff
cp ../src/logic_solver.cc ./simp/logic_solver.cc
export LFLAGS="-sALLOW_MEMORY_GROWTH  -s STACK_SIZE=33554432 -sMODULARIZE -s 'EXPORT_NAME=MINISAT' -s INVOKE_RUN=0 -s EXPORTED_FUNCTIONS=\"['_main','cwrap']\" -s EXPORTED_RUNTIME_METHODS=\"['stackSave','stackRestore','allocate','ALLOC_STACK','setValue','getValue']\""
cd simp
emmake make clean
emmake make rs
cp minisat_static* ../../src/cjs
export LFLAGS=$LFLAGS" -s EXPORT_ES6=1"
export EXEC="minisat_cjs"
emmake make clean
emmake make rs
cp minisat_static* ../../src/mjs
cd ..
