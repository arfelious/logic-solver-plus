# Logic Solver Plus
Logic solver plus is a fork of logic-solver with additional features and type support. The project is under rapid development and the package has not been published to npm yet.
### Key Differences
Module supports both ESM and CJS style imports. You can choose to import or require it depending on your project.

`Logic.sum` and many other methods can be ~30% faster than the original version without any changes due to the compilation target being WASM instead of JS

New `Logic.product` and `Logic.subtract` methods.


Solver needs to be asynchronous initialized before using, this happened synchronously in the original version.


Example:
```javascript
import Logic from 'logic-solver-plus'


const solver = new Logic.Solver()
await solver.initialize()
//...
```