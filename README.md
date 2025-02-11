# Logic Solver Plus
Logic solver plus is a fork of logic-solver with additional features and type support. The project is under rapid development and the API for new features may change. You can safely assume anything not mentioned here is backwards compatible with the original version.
### Key Differences
Module supports both ESM and CJS style imports. You can choose to import or require it depending on your project.

`Logic.sum` and many other methods can be ~30% faster than the original version without any changes due to the compilation target being WASM instead of JS

New `Logic.product` and `Logic.subtract` methods.

Compiled with ALLOW_MEMORY_GROWTH to allow projects with relatively high amount of constraints to fully utilize methods like `Logic.product`

Solver needs to be asynchronous initialized before using, this happened synchronously in the original version.


Example:
```javascript
import Logic from 'logic-solver-plus'


const solver = new Logic.Solver()
await solver.initialize()
//...
```