var Pool = require('../lib/index.min');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var expect = chai.expect;

chai.use(sinonChai);

describe('object-pool', function () {
	var sandbox, Type, pool;

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		Type = sandbox.spy(function () {
			this.wasAllocatedWithNew = this.wasAllocatedWithNew === undefined;
		});
		pool = new Pool(Type);
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
		var arg1 = 'arg1';
		var arg2 = 'arg2';
		var arg3 = 'arg3';
		var arg4 = 'arg4';

		describe('when there are no current released items', function () {
			beforeEach(function () {
				pool.allocate();
				pool.allocate();

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

		describe('when there are current released items', function () {
			beforeEach(function () {
				var temp = pool.allocate();

				pool.allocate();
				pool.release(temp);
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
	});

	describe('release', function () {
		var item;

		describe('when an item has been allocated', function () {
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
			});

			it('should throw an error', function () {
				function releaseAgain() {
					pool.release(item);
				}

				expect(releaseAgain).to.throw(Error);
			});
		});

		describe('when item was created outside the object-pool', function () {
			beforeEach(function () {
				item = new Type();
			});

			it('should throw an error', function () {
				function release() {
					pool.release(item);
				}

				expect(release).to.throw(Error);
			});
		});
	});
});
