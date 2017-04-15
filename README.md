# Object-pool

Reusable pool of objects to reduce garbage collection

## TOC

* [Installation](#installation)
* [General usage](#general-usage)
  * [Creating a new pool](#creating-a-new-pool)
  * [Allocating an item](#allocating-an-item)
  * [Releasing an item](#releasing-an-item)
  * [Iterating through items](#iterating-through-items)
* [Extended usage](#extended-usage)
  * [Removing released items](#removing-released-items)
  * [Getting info about pool](#getting-info-about-pool)
  * [Detecting errors](#detecting-errors)
  * [Changing `_poolIndex` property](#changing-_poolindex-property)

## Installation

Intall the module using npm. The module isn't published yet but can be installed from the github repo:
```shell
$ npm install --save borilla/object-pool
```

## General usage

### Creating a new pool

```javascript
var Pool = require('@borilla/object-pool');

// constructor for items to be managed by pool
var MyType = function (arg1, arg2) { ... };

// create a pool for this type
var myPool = new Pool(MyType);
```

### Allocating an item

```javascript
// get a [new or released] item from the pool
var myItem = myPool.allocate('arg1', 'arg2');
```
* Internally, the module will effectively call `new MyType(...)` or `MyType.apply(releasedItem, ...)` depending on whether we're creating a new item or reallocating a previously released one
* Any arguments sent to `allocate()` will be passed to the constructor function

### Releasing an item

```javascript
// release myItem for reallocation
myPool.release(myItem);
```
* Will mark the released item as no longer used, thus make it available for reallocation
* Trying to release an item that has already been released will call the pool's [error handler](#detecting-errors) if defined

### Iterating through items

```javascript
// loop through all currently allocated items
myPool.forEach(function (item) {
	... // do something with item
});
```
* Will call provided callback function for all currently allocated items
* Items will not necessarily be in the same **order** as they were allocated
* **Warning:** Calling _any_ other method on `myPool` during the `forEach` loop will fail (returning `undefined` instead of any expected value) and will call the pool's [error handler](#detecting-errors) if defined

## Extended usage

### Removing released items

```javascript
// allow released items to be garbage collected
myPool.clean();
```
* If we've allocated and released a lot of items we might want some memory back after all. This method truncates the internal array, thus losing references to "released" items, allowing them to be garbage collected

### Getting info about pool

```javascript
// get info object
myPool.info(); // eg { allocated: 10, released: 5 }
```
* Gets current counts of allocated and released items
* **Warning:** Creates a new object [that will need to be **garbage collected!!!**], so really for debug use only

### Detecting errors

If we want to know when/if any errors occur in the pool, we can pass our own custom error handler
callback to the pool's constructor function, eg

```javascript
// custom error handler, log any error messages to console
function onError(msg) {
	console.log('Something went wrong with object-pool: ' + msg);
}

// create a pool (passing in our error handler)
var myPool = new Pool(MyType, onError);
```
* Error handler will be sent a short error description
* If no handler is provided then the method that caused the error will fail silently
* Examples of errors include:
  * Trying to allocate an item while within a `pool.forEach()` loop
  * Trying to release an item that has already been released

### Changing `_poolIndex` property

By default, each allocated item will have an additional property added, called `_poolIndex`.
While unlikely, it is possible that this name might clash with one of the object's property
names. To mitigate this we can provide our own custom property identifier to the pool's
constructor, eg

```javascript
// we're using es2015 so can use a Symbol() to guarantee no clash is possible :)
const poolIndex = Symbol('poolIndex');

// create a pool (passing in pool-index identifier)
const myPool = new Pool(MyType, /*onError*/, poolIndex);
```
