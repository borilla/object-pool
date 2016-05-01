'use strict';

var _poolIndex = '_poolIndex';
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

	if (storeTopIndex === store.length) {
		item = newTypeWithArgs(Type, arguments);
		store.push(item);
	}
	else {
		item = store[pool._storeTopIndex];
		// call "Type()" with args sent to "allocate"
		Type.apply(item, arguments);
	}

	item[_poolIndex] = storeTopIndex;

	return item;
};

poolPrototype.release = function (item) {
	var pool = this;
	var index = item[_poolIndex];
	var topItem;

	checkIsNotLocked(pool, 'release');
	checkIsAllocated(item);

	if (index < pool._storeTopIndex) {
		topItem = pool._store[pool._storeTopIndex];
		topItem[_poolIndex] = index;
		pool._store[index] = topItem;
		pool._store[pool._storeTopIndex] = item;
	}

	item[_poolIndex] = null;
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
		fn(store[i], i);
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

function checkIsNotLocked(pool, action) {
	if (pool._isLocked) {
		throw Error('Cannot perform "' + action + '" while inside "forEach" loop');
	}
}

function checkIsAllocated(item) {
	if (typeof item[_poolIndex] !== 'number') {
		throw Error('Item is not currently allocated');
	}
}

// equivalent to es2015 "new Type(...args)"
function newTypeWithArgs(Type, args) {
	var length = args.length;
	var arr, i;

	switch (length) {
	case 0:
		return new Type();
	case 1:
		return new Type(args[0]);
	case 2:
		return new Type(args[0], args[1]);
	case 3:
		return new Type(args[0], args[1], args[2]);
	}

	arr = Array(length + 1);
	arr[0] = null;
	for (i = 0; i < length; ++i) {
		arr[i + 1] = args[i];
	}

	return new (bind.apply(Type, arr));
}

module.exports = Pool;
