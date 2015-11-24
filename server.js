var express = require("express"),
    compression = require('compression'),
    app = express(),
    jade = require("jade"),
    colors = require("colors"),
    model = require("./model"),
    helpers = require("./helpers");

var db_file = "vinmonopolet.db",
    product_list = [],
    most_recent_date,
    least_recent_date,
    useful_dates;

var days_passed = 30;

app.set('view engine', 'jade');
app.set('views', './views');
app.use('/static', express.static('static'));
jade.renderFile('./views/index.jade', { cache : true });
app.use(compression());

var env = process.env.NODE_ENV || 'development';

if (env == "test") {
    console.log("Test enviornment".yellow);
    model.open_db(db_file);
    model.do_check_db();
} else if (env == "development") {
    console.log("Development enviornment".rainbow);
    model.open_db(db_file);
    model.do_check_db();
    setInterval(function() { model.do_check_db(); }, 1000 * 60 * 15);
} else if (env == "production") {
    console.log("Production enviornment".green);
    model.open_db(db_file);
    model.do_check_db();
    setInterval(function() { model.do_check_db(); }, 1000 * 60 * 15);
}

setInterval(model.update_product_list, 1000 * 60 * 60);
model.update_product_list();


function send_product_list(req, res) {
    var query = req.query.s,
        rtn_data = [];

    if (query.length < 3)
        return res.jsonp(rtn_data);

    model.get_product_list().forEach(function(e, idx, array)
    {
            if (e[1].toLowerCase().indexOf(query.toLowerCase()) > -1)
                rtn_data.push(e);
    });
    return res.jsonp(rtn_data);
}

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
                //TODO: no http req should be sent to model
                return send_product_list(req, res);
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
