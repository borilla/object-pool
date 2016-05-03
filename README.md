# Object-pool
Reusable pool of objects to reduce garbage collection
## Usage
### Creating a new pool
```javascript
var Pool = require('@borilla/object-pool');

// constructor for items to be managed by pool
var MyType = function (arg1, arg2) { ... };

// create a pool for this type
var myPool = new Pool(Type);
```

### Allocating an item
```javascript
// get a [new or released] item from the pool
var myItem = myPool.allocate('arg1', 'arg2');
```
* Internally, constructor will effectively be called as `new MyType()` or `MyType.apply(item)` depending on whether we're re-using a released item or not
* In either case, any provided arguments will be passed to constructor function

### Releasing an item
```javascript
// release myItem for re-allocation
myPool.release(myItem);
```
* Will mark the released item as no longer used so make it available for re-allocation

### Iterating through allocated items
```javascript
// loop through all currently allocated items
myPool.forEach(function (item) {
	... // do something with item
});
```
* Will call provided callback for all currently allocated items
* Items will not necessarily be in the same **order** as they were allocated
* Calling any other method on `myPool` during the `forEach` loop will throw an **error**

### Removing released items from pool
```javascript
// allow released items to be garbage collected
myPool.clean();
```
* If we've allocated and released a lot of items we might want some memory back after all

### Getting info on pool
```javascript
// get info object
myPool.info(); // eg { allocated: 10, released: 5 }
```
* Gets current counts of allocated and released items
* Creates a new object [that will need to be **garbage collected!!!**], so really for debug use only
