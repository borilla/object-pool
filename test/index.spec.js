'use strict';

var Pool = require('../src/index');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = chai.expect;

chai.use(sinonChai);

describe('object-pool', function () {
	var arg0, arg1, arg2, arg3, arg4;
	var poolIndexProp, sandbox, Type, onError, pool;

	before(function () {
		arg0 = 'arg0';
		arg1 = 'arg1';
		arg2 = 'arg2';
		arg3 = 'arg3';
		arg4 = 'arg4';
		poolIndexProp = '_customPoolIndexProp';
	});

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		Type = sandbox.spy(function Type() {
			this.wasAllocatedWithNew = this.wasAllocatedWithNew === undefined;
		});
		onError = sandbox.stub();
		pool = new Pool(Type, onError, poolIndexProp);
	});

	afterEach(function () {
		sandbox.restore();
	});

	it('should initially reflect that no items have been allocated or released', function () {
		expect(pool.info()).to.deep.equal({
			allocated: 0,
			released: 0
		});
	});

	describe('allocate', function () {
		var item;

		describe('when there are no released items', function () {
			var ITEMS_TO_ALLOCATE = 2;
			var ITEMS_TO_RELEASE = 0;

			beforeEach(function () {
				initialisePool(ITEMS_TO_ALLOCATE, ITEMS_TO_RELEASE);
				Type.reset();
				item = pool.allocate(arg1, arg2, arg3, arg4);
			});

			it('should call Type constructor with new', function () {
				expect(Type).to.be.calledOnce;
				expect(item.wasAllocatedWithNew).to.be.true;
			});

			it('should pass args to constructor', function () {
				expect(Type).to.be.calledWithExactly(arg1, arg2, arg3, arg4);
			});

			it('should return an object of type Type', function () {
				expect(item).to.be.an.instanceof(Type);
			});

			it('should set "poolIndexProp" property of the created item', function () {
				expect(item[poolIndexProp]).to.be.a('number');
			});

			it('should reflect that item has been allocated', function () {
				expect(pool.info()).to.deep.equal({
					allocated: ITEMS_TO_ALLOCATE + 1,
					released: 0
				});
			});
		});

		describe('when there is a released item', function () {
			var ITEMS_TO_ALLOCATE = 2;
			var ITEMS_TO_RELEASE = 1;

			beforeEach(function () {
				initialisePool(ITEMS_TO_ALLOCATE, ITEMS_TO_RELEASE);
				Type.reset();
				item = pool.allocate(arg1, arg2);
			});

			it('should call Type constructor without using new', function () {
				expect(Type).to.be.calledOnce;
				expect(item.wasAllocatedWithNew).to.be.false;
			});

			it('should pass args to constructor', function () {
				expect(Type).to.be.calledWithExactly(arg1, arg2);
			});

			it('should return an object of type Type', function () {
				expect(item).to.be.an.instanceof(Type);
			});

			it('should set "poolIndexProp" property of the created item', function () {
				expect(item[poolIndexProp]).to.be.a('number');
			});

			it('should reflect that item has been allocated', function () {
				expect(pool.info()).to.deep.equal({
					allocated: ITEMS_TO_ALLOCATE,
					released: ITEMS_TO_RELEASE - 1
				});
			});
		});

		describe('when creating new items', function () {
			beforeEach(function () {
				pool.allocate(arg0);
				pool.allocate(arg0, arg1);
				pool.allocate(arg0, arg1, arg2);
				pool.allocate(arg0, arg1, arg2, arg3);
				pool.allocate(arg0, arg1, arg2, arg3, arg4);
			});

			it('should always pass correct arguments', function () {
				expect(Type).to.be.calledWithExactly(arg0);
				expect(Type).to.be.calledWithExactly(arg0, arg1);
				expect(Type).to.be.calledWithExactly(arg0, arg1, arg2);
				expect(Type).to.be.calledWithExactly(arg0, arg1, arg2, arg3);
				expect(Type).to.be.calledWithExactly(arg0, arg1, arg2, arg3, arg4);
			});
		});

		describe('when reallocating released items', function () {
			var ITEMS_TO_ALLOCATE = 5;
			var ITEMS_TO_RELEASE = 5;

			beforeEach(function () {
				initialisePool(ITEMS_TO_ALLOCATE, ITEMS_TO_RELEASE);
				Type.reset();
				pool.allocate(arg0);
				pool.allocate(arg0, arg1);
				pool.allocate(arg0, arg1, arg2);
				pool.allocate(arg0, arg1, arg2, arg3);
				pool.allocate(arg0, arg1, arg2, arg3, arg4);
			});

			it('should always pass correct arguments', function () {
				expect(Type).to.be.calledWithExactly(arg0);
				expect(Type).to.be.calledWithExactly(arg0, arg1);
				expect(Type).to.be.calledWithExactly(arg0, arg1, arg2);
				expect(Type).to.be.calledWithExactly(arg0, arg1, arg2, arg3);
				expect(Type).to.be.calledWithExactly(arg0, arg1, arg2, arg3, arg4);
			});
		});

		describe('when no "poolIndexProp" parameter is provided to Pool constructor', function () {
			var prevPoolIndexProp;

			before(function () {
				prevPoolIndexProp = poolIndexProp;
				poolIndexProp = undefined;
			});

			beforeEach(function () {
				item = pool.allocate();
			});

			it('should use the default value', function () {
				expect(item._poolIndex).to.be.a('number');
			});

			after(function () {
				poolIndexProp = prevPoolIndexProp;
			});
		});
	});

	describe('release', function () {
		var item;

		describe('when an item has previously been allocated', function () {
			beforeEach(function () {
				item = pool.allocate();
				pool.release(item);
			});

			it('should reflect that item has been released', function () {
				expect(pool.info()).to.deep.equal({
					allocated: 0,
					released: 1
				});
			});
		});

		describe('when item has already been released', function () {
			beforeEach(function () {
				item = pool.allocate();
				pool.release(item);
				pool.release(item);
			});

			it('should call onError callback (if provided)', function () {
				expect(onError).to.be.calledOnce;
			});

			it('should provide an appropriate error message', function () {
				expect(onError).to.be.calledWithMatch('not currently allocated');
			});
		});

		describe('when item was created outside the object-pool', function () {
			beforeEach(function () {
				item = new Type();
				pool.release(item);
			});

			it('should call onError callback (if provided)', function () {
				expect(onError).to.be.calledOnce;
			});

			it('should provide an appropriate error message', function () {
				expect(onError).to.be.calledWithMatch('not currently allocated');
			});
		});
	});

	describe('forEach', function () {
		var item0, item1, item2, item3, item4;
		var fn;

		beforeEach(function () {
			item0 = pool.allocate();
			item1 = pool.allocate();
			item2 = pool.allocate();
			item3 = pool.allocate();
			item4 = pool.allocate();

			pool.release(item1);
			pool.release(item3);

			fn = sandbox.stub();

			pool.forEach(fn);
		});

		it('should trigger callback function for each allocated item', function () {
			expect(fn).to.be.calledThrice;
			expect(fn).calledWithExactly(item0);
			expect(fn).calledWithExactly(item2);
			expect(fn).calledWithExactly(item4);
		});

		it('should not trigger callback function for released items', function () {
			expect(fn).to.not.be.calledWith(item1);
			expect(fn).to.not.be.calledWith(item3);
		});

		[ 'allocate', 'release', 'forEach', 'clean' ].forEach(function (operation) {
			describe('when we try to perform "' + operation + '" during forEach loop', function () {
				var doOperation;

				beforeEach(function () {
					doOperation = sandbox.spy(function (item) {
						// NOTE: sending "item" to each method is okay for now, but may cause errors in future
						return pool[operation](item);
					});

					pool.forEach(doOperation);
				});

				it('should call onError callback', function () {
					// onError will be called for each iteration of our loop, ie for each allocated item
					expect(onError).to.be.calledThrice;
				});

				it('should provide an appropriate error message', function () {
					expect(onError).to.be.calledWithMatch('inside "forEach" loop');
				});

				it('"' + operation + '" should return undefined', function () {
					expect(doOperation.alwaysReturned(undefined)).to.equal(true);
				});
			});
		});
	});

	describe('clean', function () {
		var ITEMS_TO_ALLOCATE = 10;
		var ITEMS_TO_RELEASE = 5;

		beforeEach(function () {
			initialisePool(ITEMS_TO_ALLOCATE, ITEMS_TO_RELEASE);
			pool.clean();
		});

		it('should remove any released items from store', function () {
			expect(pool.info().released).to.equal(0);
		});
	});

	// helper to setup pool for test by allocating and releasing some items
	function initialisePool(itemsToAllocate, itemsToRelease) {
		var items = [];
		var i;

		for (i = 0; i < itemsToAllocate; ++i) {
			items.push(pool.allocate());
		}

		for (i = 0; i < itemsToRelease; ++i) {
			pool.release(items[i]);
		}

		expect(pool.info()).to.deep.equal({
			allocated: itemsToAllocate - itemsToRelease,
			released: itemsToRelease
		});
	}
});
