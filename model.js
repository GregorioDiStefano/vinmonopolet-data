var squel = require("squel"),
    sqlite3 = require("sqlite3").verbose(),
    NodeCache = require("node-cache"),
    cache = new NodeCache(),
    helpers = require("./helpers"),
    fs = require("fs");

var product_list = [],
    useful_dates,
    db,
    env = process.env.NODE_ENV;

function open_db(filename) {
    db = new sqlite3.Database(filename);
    do_check_db();
    update_product_list();

    fs.watch(filename, function () {
            do_check_db();
            update_product_list();
    });
}

function get_item_info(id, callback) {
    if (isNaN(id)) {
        console.error("Invalid request");
        return [];
    }

    var item_name = "";
    var item_data = [];

    var query = squel.select()
                     .field("distinct date.date_id as date")
                     .field("itemsdata.*")
                     .from("date").from("itemsdata")
                     .where("varenummer=" + id + " and date.id = itemsdata.date_id")
                     .toString();

    db.serialize(function() {
            db.each(query, function(err, row) {
                if (err)
                    console.log(err);
                else {
                    item_name = row.varenavn;
                    item_data.push({"date": row.date, "price": row.pris });
                }
        }, function() {
            var tmp = {};
            tmp[item_name] = item_data;
            callback(tmp);
        });
    });
}

function price_difference(days, callback) {
    var cache_key = arguments.callee.name;
    var value = cache.get(cache_key);

    if (value !== undefined && env != "test") {
        return callback(value);
    }

    var tmp = {};
    var prices = [];
    var past_date_str = useful_dates.past_date(days);

    var query = squel.select()
                     .field("date.date_id as itemdate")
                     .field("itemsdata.*")
                     .from("date")
                     .from("itemsdata")
                     .where("date.id = itemsdata.date_id")
                     .where("date.date_id = " + useful_dates.most_recent.quote() + " or date.date_id = " + past_date_str.quote())
                     .toString();

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
                                });
                } else {
                    tmp[row.varenummer] = row.pris;
                }
            }, function() {
                cache.set(cache_key, prices, 120);
                callback(prices);
            });
    });
}


function products_difference(days, callback) {
    var cache_key = arguments.callee.name;
    value = cache.get(cache_key);

    if (value !== undefined && env != "test") {
        return callback(value);
    }

    var past_date_str = useful_dates.past_date(days);
    var new_items = [];

    //raw sql, since it doesnt look any better using squel
    var query = "SELECT itemsdata.* FROM itemsdata, date WHERE (date.id = itemsdata.date_id) AND (date.date_id = " + useful_dates.most_recent.quote() + ") and varenummer not in (SELECT distinct varenummer FROM itemsdata, date where  (date.id = itemsdata.date_id) AND (date.date_id = "+ past_date_str.quote() +"))";

    db.serialize(function() {
        db.each(query, function(err, row) {
            if (err) {
                console.log(err);
            }
            else {
                new_items.push(row);
            }
        }, function() {
            cache.set(cache_key, new_items, 120);
            callback(new_items);
        });
    });
}

function update_product_list(cb) {
    tmp_product_list = [];

    var query = squel.select()
                     .field("distinct varenummer as n")
                     .field("varenavn as name")
                     .field("volum as volume")
                     .from("itemsdata")
                     .toString();

    db.serialize(function() {
        db.each(query, function(err, row) {
            if (err) {
                console.log(err);
            }
            else {
                tmp_product_list.push([row.n, row.name, row.volume]);
            }
        }, function() {
               if (tmp_product_list.length === 0) {
                   console.log("No products found. Database problem!");
               } else {
                   product_list = tmp_product_list
                   console.log("Product list complete. Item count: ", product_list.length);
                   cb && cb();
               }
        });
    });
}

function check_database(cb) {
    var db_dates = [];
    var error = false;

    // most recent date in the database
    var query = squel.select("id").from("date order by id desc").toString();

    db.serialize(function() {
        db.each(query, function(err, row) {
            if (err) {
                console.log(err);
                error = true;
            } else {
                db_dates.push({ "row.date_id" : row.date_id, "row.id" : row.id });
            }

        }, function() {
                if (!error && db_dates.length > 0) {
                    console.log("Database looks okay.");
                    cb(db_dates);
                } else {
                    console.log("Database is in error state");
                    cb();
                }
        });
    });
}

//ugly, needs to be improved
function do_check_db(cb) {
        check_database(function(db_dates) {
            var most_recent_date,
                least_recent_date;

            try {
                most_recent_date = db_dates[0]["row.date_id"];
                least_recent_date = db_dates[db_dates.length - 1]["row.date_id"];
                set_useful_dates(helpers.UsefulDates(most_recent_date, least_recent_date));
            } catch (e) {
                console.log("Error setting database dates");
                cb && cb(); //notify mocha this is done
            }

            if (most_recent_date != useful_dates.today_str ) {
                console.log(("Datebase not recent! Data being used is from: " + most_recent_date));
            } else {
                console.log("Database running with latest data!");
            }
            cb && cb(); //notify mocha
        });
}

function set_useful_dates(dates) {
    useful_dates = dates;
}

function get_product_list() {
    return product_list;
}
//for testing
function get_useful_dates() { return useful_dates; }
// end


module.exports.do_check_db = do_check_db;
module.exports.open_db = open_db;
module.exports.check_database = check_database;
module.exports.update_product_list = update_product_list;
module.exports.get_product_list = get_product_list;
module.exports.get_item_info = get_item_info;
module.exports.price_difference = price_difference;
module.exports.products_difference = products_difference;
