if [ -f /etc/profile.d/emscripten.sh ]; then
  source /etc/profile.d/emscripten.sh
elif [ -f /usr/lib/emsdk/emsdk_env.sh ]; then
  source /usr/lib/emsdk/emsdk_env.sh
fi

if [ -d "minisat/minisat/simp" ] && [ ! -d "minisat/simp" ]; then
  cp -r minisat/minisat/* minisat/
elif [ ! -d "minisat/simp" ]; then
  echo "Downloading MiniSat 2.2.0 source..."
  curl -s http://minisat.se/downloads/minisat-2.2.0.tar.gz | tar -xz
fi
if ! grep -q "parse_DIMACS_string" minisat/core/Dimacs.h 2>/dev/null; then
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
  cd ..
fi

cp src/logic_solver.cc minisat/simp/logic_solver.cc
export CFLAGS="-sUSE_ZLIB=1"
export LFLAGS="-sUSE_ZLIB=1 -sALLOW_MEMORY_GROWTH -sSTACK_SIZE=33554432 -sMODULARIZE -sEXPORT_NAME=MINISAT -sEXPORT_ES6=1 -sINVOKE_RUN=0 -sEXPORTED_FUNCTIONS=\"['_main']\" -sEXPORTED_RUNTIME_METHODS=\"['cwrap','stackSave','stackRestore','allocate','ALLOC_STACK','setValue','getValue']\""
cd minisat/simp
emmake make clean
emmake make rs
cp minisat_static* ../../src/
cd ../..
