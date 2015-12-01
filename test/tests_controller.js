process.env.NODE_ENV = 'test'

var http = require('http'),
    assert = require('assert'),
    shelljs = require('shelljs');

shelljs.exec("cd test && cp data/test.db.original ./test.db")
var server = require("../server");

describe("check new product 1 is in new_products.json", function() {
    it("should contain \"new2\" products in products.json", function(done) {
        http.get({
            hostname: 'localhost',
            port: 3000,
            path: '/api/get/products.json?s=new%20product%202'
        }, function (res) {
            res.on("data", function(chunk) {
                data = JSON.parse(chunk.toString())[0]
                assert.deepEqual(data, [ 9999, 'New product 2', 0.35 ])
                done()
            });
        })
    });
})


describe("update database again and check", function() {
    it("db should be modified without issues", function(done) {
        shelljs.exec("cd test && python csv_to_db.py data/produkter20151122-002728-919.csv 2>/dev/null", {silent:true})
        done()
    })
})

describe("check new product 3 is in new_products.json", function() {
    it("should contain \"new\" products in products.json", function(done) {
        http.get({
            hostname: 'localhost',
            port: 3000,
            path: '/api/get/products.json?s=new%20product%203'
        }, function (res) {
            res.on("data", function(chunk) {
                data = JSON.parse(chunk.toString())[0]
                assert.deepEqual(data, [ 10000, 'New product 3', 0.75 ])
                done()
            });
        })
    });
})

