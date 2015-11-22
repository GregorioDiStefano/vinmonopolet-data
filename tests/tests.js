process.env.NODE_ENV = 'test'

var rewire = require('rewire'),
    app_export = rewire('../server'),
    assert = require('assert');

var get_price_difference_lookup = app_export.__get__('price_difference_lookup'),
    get_product_difference = app_export.__get__('products_difference'),
    get_do_check_db = app_export.__get__('do_check_db');

before(function (done) {
    get_do_check_db(function() {
        done()
    })
})


describe("price detectien", function() {
    it("should detect differences in prices", function(done) {
        get_price_difference_lookup(2, function(prices) {
            console.log(prices)
            done()
        })
    });
})


describe("new product detection", function() {
    it("should detect \"new\" products", function(done) {
            get_product_difference(3, function(new_items) {
                console.log(new_items)
                done()
            })
    });
})

