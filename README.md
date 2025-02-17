# Logic Solver Plus
Logic solver plus is a fork of logic-solver with additional features and type support. The project is under rapid development and the API for new features may change. You can safely assume anything not mentioned here is backwards compatible with the original version.
### Key Differences
Module supports both ESM and CJS style imports. You can choose to import or require it depending on your project.

Logic Solver Plus is compiled with ALLOW_MEMORY_GROWTH to allow projects with relatively high amount of constraints and fully utilize new methods like `Logic.product`

`Logic.sum` and many other methods can be ~30% faster than the original version without any changes due to the compilation target being WASM instead of JS



#### Logic.product(operands...)

Represents an integer expression that is the product of the values of all
the operands.  Bits are interpreted as integers, and booleans are
interpreted as 1 or 0.

###### Parameters

* `operands...` - Zero or more Formulas, Terms, Bits, or Arrays

###### Returns

Bits

#### Logic.subtract(minuend, subtrahend)

Represents an integer expression that is the difference between first and second argument. As integers are not signed, you need to consider the possibility of integer underflow.

###### Parameters

* `operands...` - Zero or more Formulas, Terms, Bits, or Arrays

###### Returns

Bits

**Logic.Solver#requireOptional(formulas,weights,options)**


###### Parameters

* `formulas` Formulas is a formula or an array of formulas that is nested arbitrarily deep.

* `weights` Weight values are meant to correspond to formulas, but you can also have one weight per formula array.
* `options` You can specify requiredRatio property `(0-1.0)` to set the treshold for the `isValid` property of the returned object. Defaults to `0.9`

###### Returns:

A status object with isValid and ratio properties where they are updated each time Logic.Solver#solveOptional() is called. Ratio value is calculated by division of the weighted sum of satisfied constraints to all constraints.

**Logic.Solver#solveOptional(options)**

This method iterates over arrays of formulas required by Logic.Solver#requireOptional and tries to maximize the satisfied formulas. You can prioritize optional elements by ordering calls to this method where the first formulas are more prioritized.



###### Parameters

* `options` Currently there is only method property where only valid value is `greedy`

###### Returns:

Logic.Solution or null


## Usage Examples


Solver needs to be asynchronously initialized before using, this happened synchronously in the original version.


Example:
```javascript
import Logic from 'logic-solver-plus'


const solver = new Logic.Solver()
await solver.initialize()
//...
```