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
    get_get_useful_dates = model_export.__get__('get_useful_dates'),
    get_get_product_list = model_export.__get__('get_product_list'),
    get_update_product_list = model_export.__get__('update_product_list');

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
            //check also for varenummer 1503 and 9999
            var seen_varenummer = []
            new_items.forEach(function(e, idx, array) {
                seen_varenummer.push(e.varenummer)
            })
            assert.deepEqual(seen_varenummer.sort(), [1503, 9999])
            done()
        })
    });


})


describe("update database again and check", function() {
    it("db should be modified without issues", function(done) {
        shelljs.exec("cd test && python csv_to_db.py data/produkter20151122-002728-919.csv 2>/dev/null", {silent:true})
        done()
    }),

    it("should execute do_db_check", function(done) {
        get_do_check_db(function() {
            done()
        })
    }),

    it("should update product list", function(done) {
        get_update_product_list(function() {
            done()
        })
    }),

    it("should contain new products when product list updated", function() {
        products = get_get_product_list()
        assert.deepEqual(products[products.length - 1], [10000, "New product 3", 0.75])
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
