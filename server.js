var sqlite3 = require('sqlite3').verbose();
var express = require("express")
var squel = require("squel")
var app = express()
var NodeCache = require( "node-cache" );
var cache = new NodeCache();
var _ = require('underscore');

app.set('view engine', 'jade');
app.set('views', './views');
app.use('/static', express.static('static'));

if (app.get('env') === 'development') {
  app.locals.pretty = true;
}

var product_list = []; //mapping would be easier to work with
var db = new sqlite3.Database('vinmonopolet.db');

String.prototype.quote = (function(){
    return '"' + this + '"';
})

function check_database() {
    var today = new Date();
    var today_str = today.toISOString().substr(0, 10);

    var error = false;
    var query = squel.select("id").from("date order by id desc limit 1").toString()

    //check if most recent date is in db
    db.parallelize(function() {
        db.each(query, function(err, row) {
            if (err) {
                console.log(err);
                error = true;
            }
            else {
                if (row.date_id != today_str) {
                    error = true;
                    var details = "expected: " + today_str + " found: " + row.date_id;
                    console.error("Most recent data not imported to database: " + details);
                }
            }
        }, function() {
                if (!error)
                    console.log("Database looks okay.");
        })
    })
}

function products_difference(days, callback) {
    var cache_key = arguments.callee.name;
    value = cache.get(cache_key);

    if (value !== undefined) {
        return callback(value);
    }

    var today = new Date();
    var today_str = today.toISOString().substr(0, 10);
    var past_date_str = new Date(today.setDate(today.getDate() - days)).toISOString().substr(0, 10);
    var new_items = [];

    var query = "SELECT distinct varenummer, varenavn, vareurl FROM itemsdata, date WHERE (date.id = itemsdata.date_id) AND (date.date_id = " + today_str.quote() + ") and varenummer not in (SELECT distinct varenummer FROM itemsdata, date where  (date.id = itemsdata.date_id) AND (date.date_id = "+ past_date_str.quote() +"))"

    db.parallelize(function() {
        db.each(query, function(err, row) {
            if (err)
                console.log(err);
            else
                new_items.push(row);
        }, function() {
            success = cache.set(cache_key, new_items, 120);
            callback(new_items);
        })
    });
}

function price_difference_lookup(days, callback) {
    var cache_key = arguments.callee.name;
    value = cache.get(cache_key);

    if (value !== undefined) {
        return callback(value);
    }

    var tmp = {};
    var prices = [];

    db.parallelize(function() {
            today = new Date();
            today_str = today.toISOString().substr(0, 10);
            past_date_str = new Date(today.setDate(today.getDate() - days)).toISOString().substr(0, 10);

            db.each(squel.select().field("date.date_id as itemdate").field("varenummer").field("varenavn").field("pris").field("vareurl")
                                  .from("date").from("itemsdata")
                                  .where("date.id = itemsdata.date_id")
                                  .where("date.date_id = " + today_str.quote() + " or date.date_id = " + past_date_str.quote()).toString(), function(err, row)
            {
                if (err)
                    console.log(err);
                else {
                        if (row.varenummer in tmp && tmp[row.varenummer] != row.pris) {
                            prices.push({ "varenummer" : row.varenummer, "varenavn": row.varenavn, "old_price": tmp[row.varenummer], "new_price" : row.pris})
                        } else {
                            tmp[row.varenummer] = row.pris;
                        }
                }
            }, function() {
                success = cache.set(cache_key, prices, 120);
                callback(prices);
            })
    })
}


function update_product_list() {
    db.parallelize(function() {
        db.each(squel.select().field("distinct varenummer as n").field("varenavn as name").from("itemsdata").toString(), function(err, row) {
            if (err)
                console.log(err);
            else
                product_list.push([row.n, row.name])
        }, function() {
                if (product_list.length === 0) {
                    console.log("No products found. Database problem!");
                }
                else {
                    console.log("Product list complete. Item count: ", product_list.length);
                }
        })
    });
}

update_product_list()
check_database()
setInterval(update_product_list, 1000 * 60 * 60)

function get_item_info(req, res) {
    id = req.query.i
    if (isNaN(id))
        return res.status(403).send("Malformed request")

    var item_name = ""
    var item_data = []

    var db = new sqlite3.Database('vinmonopolet.db');
    db.serialize(function() {
            db.each(squel.select().field("distinct date.date_id as date")
                                  .field("varenummer")
                                  .field("varenavn")
                                  .field("pris")
                                  .from("date").from("itemsdata")
                                  .where("varenummer=" + id + " and date.id = itemsdata.date_id").toString(), function(err, row) {
                if (err)
                    console.log(err)
                else {
                    item_name = row.varenavn
                    item_data.push({"date": row.date, "price": row.pris })
                }
        }, function() {
            var tmp = {}
            tmp[item_name] = item_data
            return res.jsonp(tmp)
        })
    })
}

function send_product_list(req, res) {
    query = req.query.s
    rtn_data = []

    if (query.length < 3)
        return res.jsonp(rtn_data)

    product_list.forEach(function(e, idx, array)
    {
            if (e[1].toLowerCase().indexOf(query.toLowerCase()) > -1)
                rtn_data.push(e)
    })
    return res.jsonp(rtn_data)
}

app.get('/', function (req, res) {
    var finished = _.after(2, do_render);
    var diff_prices
    var diff_products

    price_difference_lookup(30, function(data) {
        diff_prices = data
        finished()
    })

    products_difference(30, function(data) {
        diff_products = data
        finished()
    })

    function do_render() {
        res.render('index.jade', {
                                   diff_products : diff_products,
                                   diff_prices : diff_prices
                                 });
    }
});


app.get('/api/*', function(req, res) {
    path = req.path

    if (path.split("/")[2] == "get")
    {
        next_path = path.split("/")[3]
        switch (next_path) {
            case "products.json":
                return send_product_list(req, res)
            case "item_info.json":
                return get_item_info(req, res)
            default:
                console.error("GET req: " + req.path + " failed")
                res.status(403).send("Request not understood")
        }
    }
})

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Listening at http://%s:%s', host, port);
});

