const _poolIndex = Symbol('_poolIndex');

class Pool {
	constructor(Type) {
		this._Type = Type;
		this._store = [];
		this._storeTopIndex = -1;
		this._isLocked = false;
	}

	allocate() {
		const store = this._store;
		const storeTopIndex = ++this._storeTopIndex;
		const Type = this._Type;
		let item;

		this._checkIsNotLocked('allocate');

		if (storeTopIndex === store.length) {
			// call "new" with args sent to "allocate" (handy use of spread operator :D)
			item = new Type(...arguments);
			store.push(item);
		}
		else {
			item = store[this._storeTopIndex];
			// call constructor function with args sent to "allocate"
			Type.apply(item, arguments);
		}

		item[_poolIndex] = storeTopIndex;

		return item;
	}

	release(item) {
		const index = item[_poolIndex];

		this._checkIsNotLocked('release');

		if (index < this._storeTopIndex) {
			let topItem = this._store[this._storeTopIndex];

			topItem[_poolIndex] = index;
			this._store[index] = topItem;
			this._store[this._storeTopIndex] = item;
		}

		this._storeTopIndex--;
	}

	clean() {
		this._checkIsNotLocked('clean');
		this._store.length = this._storeTopIndex + 1;
	}

	// NOTE: What if we "allocate" or "release" while performing "forEach"?
	forEach(fn) {
		const store = this._store;

		this._checkIsNotLocked('forEach');
		this._isLocked = true;

		for (let i = 0, l = this._storeTopIndex + 1; i < l; ++i) {
			fn(store[i], i);
		}

		this._isLocked = false;
	}

	_checkIsNotLocked(action) {
		if (this._isLocked) {
			throw Error('Cannot perform "' + action + '" while inside "forEach" loop');
		}
	}

	toString() {
		let allocated = this._storeTopIndex + 1;
		let unallocated = this._store.length - allocated;
		let items = this._store.slice(0, allocated);

		return 'Allocated: ' + allocated
			+ ', Unallocated: ' + unallocated + '\n'
			+ items.map(function (item) {
				return '' + item;
			}).join(', ');
	}
}

module.exports = Pool;
