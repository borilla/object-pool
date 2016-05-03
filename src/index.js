'use strict';

var poolIndex = '_poolIndex';
var poolPrototype = Pool.prototype;
var bind = Function.prototype.bind;

function Pool(Type) {
	var pool = this;

	pool._Type = Type;
	pool._store = [];
	pool._storeTopIndex = -1;
	pool._isLocked = false;
}

poolPrototype.allocate = function () {
	var pool = this;
	var store = pool._store;
	var storeTopIndex = ++pool._storeTopIndex;
	var Type = pool._Type;
	var item;

	checkIsNotLocked(pool, 'allocate');

	// if no released slots in store
	if (storeTopIndex === store.length) {
		// create a new item and add it to store
		item = this._createNewItem.apply(this, arguments);
		store.push(item);
	}
	else {
		// get a released item and call constructor function on it
		item = store[pool._storeTopIndex];
		Type.apply(item, arguments);
	}

	item[poolIndex] = storeTopIndex;

	return item;
};

poolPrototype.release = function (item) {
	var pool = this;
	var index = item[poolIndex];
	var topItem;

	checkIsNotLocked(pool, 'release');
	checkIsAllocated(item);

	if (index < pool._storeTopIndex) {
		topItem = pool._store[pool._storeTopIndex];
		topItem[poolIndex] = index;
		pool._store[index] = topItem;
		pool._store[pool._storeTopIndex] = item;
	}

	item[poolIndex] = null;
	pool._storeTopIndex--;
};

poolPrototype.clean = function () {
	var pool = this;

	checkIsNotLocked(pool, 'clean');
	pool._store.length = pool._storeTopIndex + 1;
};

poolPrototype.forEach = function (fn) {
	var pool = this;
	var store = pool._store;
	var i, l;

	checkIsNotLocked(pool, 'forEach');
	pool._isLocked = true;

	for (i = 0, l = pool._storeTopIndex + 1; i < l; ++i) {
		fn(store[i]);
	}

	pool._isLocked = false;
};

poolPrototype.info = function () {
	var pool = this;
	var allocated = pool._storeTopIndex + 1;

	return {
		allocated: allocated,
		released: pool._store.length - allocated
	};
};

// equivalent to es2015 "new this.Type(...arguments)"
poolPrototype._createNewItem = function (arg0, arg1, arg2, arg3) {
	var Type = this._Type;
	var args = arguments;
	var length = args.length;
	var arr, i;

	// if fewer than five arguments then save creating an array
	switch (length) {
	case 0:
		return new Type();
	case 1:
		return new Type(arg0);
	case 2:
		return new Type(arg0, arg1);
	case 3:
		return new Type(arg0, arg1, arg2);
	case 4:
		return new Type(arg0, arg1, arg2, arg3);
	}

	arr = Array(length + 1);
	arr[0] = null;
	for (i = 0; i < length; ++i) {
		arr[i + 1] = args[i];
	}

	return new (bind.apply(Type, arr));
};

function checkIsNotLocked(pool, action) {
	if (pool._isLocked) {
		throw Error('Cannot perform "' + action + '" while inside "forEach" loop');
	}
}

function checkIsAllocated(item) {
	if (typeof item[poolIndex] !== 'number') {
		throw Error('Item is not currently allocated');
	}
}

module.exports = Pool;
