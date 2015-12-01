var express = require("express"),
    compression = require('compression'),
    app = express(),
    jade = require("jade"),
    colors = require("colors"),
    model = require("./model"),
    helpers = require("./helpers");

var fs = require('fs');

var most_recent_date,
    least_recent_date,
    useful_dates;

var config_file = "config/config.json",
    days_passed,
    db_file;

var env = process.env.NODE_ENV || 'development';

if (env == "test") {
    console.log("Using test");
    load_config("./test/config/config.json")
} else {
    load_config(config_file);
}

app.set('view engine', 'jade');
app.set('views', './views');
app.use('/static', express.static('static'));
jade.renderFile('./views/index.jade', { cache : true });
app.use(compression());

if (env == "test") {
    console.log("Test enviornment".yellow);
} else if (env == "development") {
    console.log("Development enviornment".rainbow);
} else if (env == "production") {
    console.log("Production enviornment".green);
}
model.open_db(db_file);

app.get('/', function (req, res) {
    res.render('index.jade', { days_passed : days_passed });
});

app.get('/api/*', function(req, res) {
    var path = req.path;

    if (path.split("/")[2] == "get")
    {
        next_path = path.split("/")[3];
        switch (next_path) {
            case "products.json":
                search = req.query.s || ""
                send_product_list(search, function(data) {
                    return res.jsonp(data);
                })
                break;
            case "item_info.json":
                model.get_item_info(req.query.i, function(data) {
                    return res.jsonp(data);
                });
                break;
            case "new_prices.json":
                model.price_difference(days_passed, function(data) {
                    return res.jsonp(data);
                });
                break;
            case "new_products.json":
                model.products_difference(days_passed, function(data) {
                    return res.jsonp(data);
                });
                break;
            default:
                console.error("GET req: " + req.path + " failed");
                res.status(500).send("Request not understood");
        }
    }
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Listening at http://%s:%s'.green, host, port);
});

function load_config(config_file) {
    try {
        config = JSON.parse(fs.readFileSync(config_file));
        if (!("database_file" in config && "days_passed" in config)) {
            throw("Configuration is incomplete")
        }

        db_file = config.database_file
        days_passed = config.days_passed
      }
      catch (err) {
        console.log('There has been an error parsing your JSON:', err)
        process.exit(1)
      }
}

function send_product_list(query, cb) {
    var rtn_data = [];

    if (query.length < 3) {
        return cb("")
    }

    model.get_product_list().forEach(function(e, idx, array)
    {
            if (e[1].toLowerCase().indexOf(query.toLowerCase()) > -1)
                rtn_data.push(e);
    });
    return cb(rtn_data)
}
