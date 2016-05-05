# Object-pool

Reusable pool of objects to reduce garbage collection

## TOC

* [Installation](#installation)
* [Usage](#usage)
  * [Creating a new pool](#creating-a-new-pool)
  * [Allocating an item](#allocating-an-item)
  * [Releasing an item](#releasing-an-item)
  * [Iterating through items](#iterating-through-items)
  * [Removing released items](#removing-released-items)
  * [Getting info about pool](#getting-info-about-pool)

## Installation

Intall the module using npm. The module isn't published yet but can be installed from the github repo:
```shell
$ npm install --save https://github.com/borilla/object-pool.git
```

## Usage

In your javascript code:

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
* Internally, the module will effectively call `new MyType()` or `MyType.apply(item)` depending on whether we're creating a new item or reallocating a previously released one
* In either case, any arguments sent to `allocate()` will be also passed to the constructor function

### Releasing an item

```javascript
// release myItem for reallocation
myPool.release(myItem);
```
* Will mark the released item as no longer used, thus make it available for reallocation
* Trying to release an item that has already been released will throw an **error**

### Iterating through items

```javascript
// loop through all currently allocated items
myPool.forEach(function (item) {
	... // do something with item
});
```
* Will call provided callback function for all currently allocated items
* Items will not necessarily be in the same **order** as they were allocated
* Calling any other method on `myPool` during the `forEach` loop will throw an **error**

### Removing released items

```javascript
// allow released items to be garbage collected
myPool.clean();
```
* If we've allocated and released a lot of items we might want some memory back after all

### Getting info about pool

```javascript
// get info object
myPool.info(); // eg { allocated: 10, released: 5 }
```
* Gets current counts of allocated and released items
* Creates a new object [that will need to be **garbage collected!!!**], so really for debug use only
