var sqlite3 = require('sqlite3').verbose();
var express = require("express")
var app = express()
app.set('view engine', 'jade');
app.set('views', './views')
app.use('/static', express.static('static'));

if (app.get('env') === 'development') {
  app.locals.pretty = true;
}


var check;
var product_list = [];


function update_product_list() {
    var db = new sqlite3.Database('vinmonopolet.db');
    db.serialize(function() {
        db.each("select distinct varenummer as n, varenavn as name from itemsdata", function(err, row) {
            if (err)
                console.log(err)
            else
                product_list.push([row.n, row.name])
        })
    });
    db.close();
}

update_product_list()
setInterval(update_product_list, 1000 * 60)

function find_matching_items(){
//SELECT DISTINCT date.id, varenummer,  varenavn, pris FROM  "date", "itemsdata" WHERE varenummer=9678501 and date.id = itemsdata.date_id
}

app.get('/', function (req, res) {
    res.render('index.jade', { title: 'Hey', message: 'Hello there!'});
});

app.get('/products', function(req, res) {
    query = req.query["s"]
    rtn_data = []

    if (query.length < 3)
        return res.jsonp(rtn_data)


    product_list.forEach(function(e, idx, array)
        {
            if (e[1].toLowerCase().indexOf(query.toLowerCase()) > -1)
                rtn_data.push(e)
        }
    )
    res.jsonp(rtn_data)
})

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});


