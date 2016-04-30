const _poolIndexStr = '_poolIndex';
const _poolIndex = typeof Symbol === 'function' ? Symbol(_poolIndexStr) : _poolIndexStr;

class Pool {
	constructor(Type) {
		const pool = this;

		pool._Type = Type;
		pool._store = [];
		pool._storeTopIndex = -1;
		pool._isLocked = false;
	}

	allocate() {
		const pool = this;
		const store = pool._store;
		const storeTopIndex = ++pool._storeTopIndex;
		const Type = pool._Type;
		let item;

		checkIsNotLocked(pool, 'allocate');

		if (storeTopIndex === store.length) {
			// call "new" with args sent to "allocate" (handy use of spread operator :D)
			item = new Type(...arguments);
			store.push(item);
		}
		else {
			item = store[pool._storeTopIndex];
			// call constructor function with args sent to "allocate"
			Type.apply(item, arguments);
		}

		item[_poolIndex] = storeTopIndex;

		return item;
	}

	release(item) {
		const pool = this;
		const index = item[_poolIndex];

		checkIsNotLocked(pool, 'release');
		checkIsAllocated(item);

		if (index < pool._storeTopIndex) {
			let topItem = pool._store[pool._storeTopIndex];

			topItem[_poolIndex] = index;
			pool._store[index] = topItem;
			pool._store[pool._storeTopIndex] = item;
		}

		item[_poolIndex] = null;
		pool._storeTopIndex--;
	}

	clean() {
		const pool = this;

		checkIsNotLocked(pool, 'clean');
		pool._store.length = pool._storeTopIndex + 1;
	}

	forEach(fn) {
		const pool = this;
		const store = pool._store;

		checkIsNotLocked(pool, 'forEach');
		pool._isLocked = true;

		for (let i = 0, l = pool._storeTopIndex + 1; i < l; ++i) {
			fn(store[i], i);
		}

		pool._isLocked = false;
	}

	info() {
		const pool = this;
		const allocated = pool._storeTopIndex + 1;

		return {
			allocated,
			released: pool._store.length - allocated
		};
	}
}

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

module.exports = Pool;
