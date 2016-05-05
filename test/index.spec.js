var Pool = require('../lib/index.min');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = chai.expect;

chai.use(sinonChai);

describe('object-pool', function () {
	var arg0 = 'arg0';
	var arg1 = 'arg1';
	var arg2 = 'arg2';
	var arg3 = 'arg3';
	var arg4 = 'arg4';
	var sandbox, Type, onError, pool;

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		Type = sandbox.spy(function () {
			this.wasAllocatedWithNew = this.wasAllocatedWithNew === undefined;
		});
		onError = sinon.stub();
		pool = new Pool(Type, onError);
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
			beforeEach(function () {
				initialisePool(2, 0);
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

			it('should reflect that item has been allocated', function () {
				expect(pool.info()).to.deep.equal({
					allocated: 3,
					released: 0
				});
			});
		});

		describe('when there is a released item', function () {
			beforeEach(function () {
				initialisePool(2, 1);
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

			it('should reflect that item has been allocated', function () {
				expect(pool.info()).to.deep.equal({
					allocated: 2,
					released: 0
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
			beforeEach(function () {
				initialisePool(5, 5);
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
					doOperation = sinon.spy(function (item) {
						// NOTE: sending "item" to each method is okay for now, but may cause errors in future
						return pool[operation](item);
					});

					pool.forEach(doOperation);
				});

				it('should call onError callback', function () {
					// onError will be called for each iteration of our loop
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
		beforeEach(function () {
			initialisePool(10, 5);
			pool.clean();
		});

		it('should remove any released items from store', function () {
			expect(pool.info().released).to.equal(0);
		});
	});

	// helper to setup pool for test by allocating and releasing some items
	function initialisePool(allocateCount, releaseCount) {
		var items = [];
		var i;

		for (i = 0; i < allocateCount; ++i) {
			items.push(pool.allocate());
		}

		for (i = 0; i < releaseCount; ++i) {
			pool.release(items[i]);
		}

		expect(pool.info()).to.deep.equal({
			allocated: allocateCount - releaseCount,
			released: releaseCount
		});
	}
});
