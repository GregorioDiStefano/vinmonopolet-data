// many tests missing, more coming...

process.env.NODE_ENV = 'test'

var rewire = require('rewire'),
    assert = require('assert'),
    shelljs = require('shelljs'),
    model_export = rewire("../model");

var get_price_difference = model_export.__get__('price_difference'),
    get_product_difference = model_export.__get__('products_difference'),
    get_open_db = model_export.__get__('open_db'),
    get_do_check_db = model_export.__get__('do_check_db'),
    get_get_useful_dates = model_export.__get__('get_useful_dates');

before(function() {
    //restore test.db to clean copy
    shelljs.exec("cd test && cp data/test.db.original ./test.db")
})

before(function (done) {
    get_open_db("./test/test.db")
    get_do_check_db(function() {
        done()
    })
})

describe("most recent db entry", function() {
    it("should be 2015-11-21", function(done) {
        assert.equal(get_get_useful_dates().most_recent, "2015-11-21")
        done()
    })
})

describe("least recent db entry", function() {
    it("should be 2015-11-19", function(done) {
        assert.equal(get_get_useful_dates().least_recent, "2015-11-19")
        done()
    })
})

describe("new price detection", function() {
    it("should detect differences in prices", function(done) {
        get_price_difference(-1, function(prices) {
            assert.equal(prices.length, 2)
            done()
        })
    });
})

describe("new product detection", function() {
    it("should detect \"new\" products", function(done) {
        get_product_difference(-1, function(new_items) {
            assert.equal(new_items.length, 2)
            done()
        })
    });
})


describe("update database again and check", function() {
    it("db should be modified without issues", function(done) {
        shelljs.exec("cd test && python csv_to_db.py data/produkter20151122-002728-919.csv 2>/dev/null", {silent:true})
        done()
    }),

    it("should execute do_db_check", function() {
        get_do_check_db(function() {
            done()
        })
    });
})

describe("most recent db entry post-update", function() {
    it("should be 2015-11-22", function(done) {
        assert.equal(get_get_useful_dates().most_recent, "2015-11-22")
        done()
    })
})


describe("new price detection post db update", function() {
    it("should detect differences in prices", function(done) {
        get_price_difference(-1, function(prices) {
            assert.equal(prices.length, 3)
            done()
        })
    });
})

describe("new product detection post db update", function() {
    it("should detect \"new\" products", function(done) {
        get_product_difference(-1, function(new_items) {
            assert.equal(new_items.length, 3)
            done()
        })
    });
})


after(function() {
    //restore test.db to clean copy
    shelljs.exec("cd test && cp data/test.db.original ./test.db")
})
