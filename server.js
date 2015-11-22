var sqlite3 = require('sqlite3').verbose(),
    express = require("express"),
    compression = require('compression'),
    squel = require("squel"),
    app = express(),
    NodeCache = require("node-cache"),
    jade = require("jade"),
    cache = new NodeCache(),
    colors = require("colors");

var db_file = "vinmonopolet.db",
    product_list = [],
    db = new sqlite3.Database(db_file),
    most_recent_date;

app.set('view engine', 'jade');
app.set('views', './views');
app.use('/static', express.static('static'));
jade.renderFile('./views/index.jade', { cache : true });
app.use(compression());

String.prototype.quote = (function(){
    return '"' + this + '"';
})

setInterval(update_product_list, 1000 * 60 * 60)
update_product_list()

function do_check_db() {
    check_database(function(recent_date, recent_date_id) {
        if (recent_date && recent_date_id) {
            most_recent_date = recent_date
            console.log(("Datebase not recent! Data being used is from: " + most_recent_date).red)
        } else {
            console.log("Database running with latest data!".green)
            most_recent_date = undefined
        }
    })
}

do_check_db()
setInterval(function() { do_check_db(); }, 1000 * 60 * 15);

function check_database(cb) {
    var today = new Date();
    var today_str = today.toISOString().substr(0, 10)
    var error = false;

    // most recent date in the database
    var query = squel.select("id").from("date order by id desc limit 1").toString()

    db.serialize(function() {
        db.each(query, function(err, row) {
            if (err) {
                console.log(err);
                error = true;
            } else if (row.date_id != today_str) {
                error = true;
                var details = "expected: " + today_str + " found: " + row.date_id;
                console.error("Most recent data not imported to database: " + details);

                //call callback with last date_id in the database
                cb(row.date_id, row.id)
            }

        }, function() {
                if (!error) {
                    console.log("Database looks okay.");
                    cb()
                }
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
    var today_str = most_recent_date || today.toISOString().substr(0, 10);
    var past_date_str = new Date(today.setDate(today.getDate() - days)).toISOString().substr(0, 10);
    var new_items = [];

    var query = "SELECT itemsdata.* FROM itemsdata, date WHERE (date.id = itemsdata.date_id) AND (date.date_id = " + today_str.quote() + ") and varenummer not in (SELECT distinct varenummer FROM itemsdata, date where  (date.id = itemsdata.date_id) AND (date.date_id = "+ past_date_str.quote() +"))"

    db.serialize(function() {
        db.each(query, function(err, row) {
            if (err) {
                console.log(err);
            }
            else {
                new_items.push(row);
            }
        }, function() {
            cache.set(cache_key, new_items, 120)
            callback(new_items);
        })
    });
}

function price_difference_lookup(days, callback) {
    var cache_key = arguments.callee.name;
    var value = cache.get(cache_key);

    if (value !== undefined) {
        return callback(value);
    }

    var tmp = {};
    var prices = [];

    var today = new Date();
    var today_str = most_recent_date || today.toISOString().substr(0, 10);
    var past_date_str = new Date(today.setDate(today.getDate() - days)).toISOString().substr(0, 10);
    var query = squel.select()
                     .field("date.date_id as itemdate")
                     .field("itemsdata.*")
                     .from("date")
                     .from("itemsdata")
                     .where("date.id = itemsdata.date_id")
                     .where("date.date_id = " + today_str.quote() + " or date.date_id = " + past_date_str.quote())
                     .toString()

    db.serialize(function() {
            db.each(query, function(err, row)
            {
                if (err) {
                    console.log(err);
                }
                else if (row.varenummer in tmp && tmp[row.varenummer] != row.pris) {
                    prices.push({ "varenummer" : row.varenummer,
                                  "varenavn": row.varenavn,
                                  "varetype": row.varetype,
                                  "alkohol": row.alkohol,
                                  "vareurl": row.vareurl,
                                  "old_price": tmp[row.varenummer],
                                  "new_price" : row.pris
                                })
                } else {
                    tmp[row.varenummer] = row.pris;
                }
            }, function() {
                cache.set(cache_key, prices, 120);
                callback(prices);
            })
    })
}


function update_product_list() {
    var query = squel.select()
                     .field("distinct varenummer as n")
                     .field("varenavn as name")
                     .field("volum as volume")
                     .from("itemsdata")
                     .toString()

    product_list = [];
    db.serialize(function() {
        db.each(query, function(err, row) {
            if (err) {
                console.log(err);
            }
            else {
                product_list.push([row.n, row.name, row.volume])
            }
        }, function() {
                if (product_list.length === 0) {
                    console.log("No products found. Database problem!");
                } else {
                    console.log("Product list complete. Item count: ", product_list.length);
                }
        })
    });
}


function get_item_info(req, res) {
    var id = req.query.i
    if (isNaN(id))
        return res.status(403).send("Malformed request")

    var item_name = ""
    var item_data = []

    var query = squel.select()
                     .field("distinct date.date_id as date")
                     .field("itemsdata.*")
                     .from("date").from("itemsdata")
                     .where("varenummer=" + id + " and date.id = itemsdata.date_id")
                     .toString()

    db.serialize(function() {
            db.each(query, function(err, row) {
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
    var query = req.query.s,
        rtn_data = [];

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
    res.render('index.jade')
});

app.get('/api/*', function(req, res) {
    var path = req.path

    if (path.split("/")[2] == "get")
    {
        next_path = path.split("/")[3]
        switch (next_path) {
            case "products.json":
                return send_product_list(req, res)
            case "item_info.json":
                return get_item_info(req, res)
            case "new_prices.json":
                price_difference_lookup(30, function(data) {
                    return res.jsonp(data)
                })
                break
            case "new_products.json":
                products_difference(30, function(data) {
                    return res.jsonp(data)
                })
                break
            default:
                console.error("GET req: " + req.path + " failed")
                res.status(500).send("Request not understood")
        }
    }
})

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Listening at http://%s:%s'.green, host, port);
});

