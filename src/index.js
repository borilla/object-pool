'use strict';

var poolPrototype = Pool.prototype;
var bind = Function.prototype.bind;

function Pool(Type, onError, poolIndexProp) {
	var pool = this;

	pool._Type = Type;
	pool._onError = onError;
	pool._poolIndexProp = poolIndexProp || '_poolIndex';
	pool._store = [];
	pool._storeTopIndex = -1;
	pool._isLocked = false;
}

poolPrototype.allocate = function () {
	var pool = this;
	var store = pool._store;
	var storeTopIndex = ++pool._storeTopIndex;
	var Type = pool._Type;
	var poolIndexProp = pool._poolIndexProp;
	var item;

	if (pool._checkIsNotLocked('allocate')) {
		// if no released slots in store
		if (storeTopIndex === store.length) {
			// create a new item and add it to store
			item = pool._createNewItem.apply(pool, arguments);
			store.push(item);
		}
		else {
			// get a released item and call constructor function on it
			item = store[pool._storeTopIndex];
			Type.apply(item, arguments);
		}

		item[poolIndexProp] = storeTopIndex;

		return item;
	}
};

poolPrototype.release = function (item) {
	var pool = this;
	var poolIndexProp = pool._poolIndexProp;
	var itemIndex = item[poolIndexProp];
	var topItem, store;

	if (pool._checkIsNotLocked('release') && pool._checkIsAllocated(item)) {
		if (itemIndex < pool._storeTopIndex) {
			store = pool._store;
			topItem = store[pool._storeTopIndex];
			topItem[poolIndexProp] = itemIndex;
			store[itemIndex] = topItem;
			store[pool._storeTopIndex] = item;
		}

		item[poolIndexProp] = null;
		pool._storeTopIndex--;
	}
};

poolPrototype.clean = function () {
	var pool = this;

	if (pool._checkIsNotLocked('clean')) {
		pool._store.length = pool._storeTopIndex + 1;
	}
};

poolPrototype.forEach = function (fn) {
	var pool = this;
	var store = pool._store;
	var i, l;

	if (pool._checkIsNotLocked('forEach')) {
		pool._isLocked = true;

		for (i = 0, l = pool._storeTopIndex + 1; i < l; ++i) {
			fn(store[i]);
		}

		pool._isLocked = false;
	}
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

poolPrototype._checkIsNotLocked = function (action) {
	var pool = this;
	var isLocked = pool._isLocked;
	var onError = pool._onError;

	if (isLocked && onError) {
		onError('Cannot perform "' + action + '" while inside "forEach" loop');
	}
	return !isLocked;
};

poolPrototype._checkIsAllocated = function (item) {
	var pool = this;
	var poolIndexProp = pool._poolIndexProp;
	var isValidIndex = typeof item[poolIndexProp] === 'number';
	var onError = pool._onError;

	if (!isValidIndex && onError) {
		onError('Item is not currently allocated');
	}
	return isValidIndex;
};

module.exports = Pool;
