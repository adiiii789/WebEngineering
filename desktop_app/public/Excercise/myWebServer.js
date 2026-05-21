// because docker/ npm handles the Website, node is legacy for proxy

var express    = require('express');
var bodyParser = require('body-parser');
var fetch      = require('node-fetch');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// localhost:4012/proxy?url=<url_to_be_proxied>
app.all('/proxy', function(req, res) {
    var decompose = req.originalUrl.split("?");
    var fullurl   = (decompose[1] + "?" + decompose[2]).replace("url=", "");
    console.log("Proxy:", fullurl);
    fetch(fullurl, {
        method:  req.method,
        headers: { 'Content-Type': 'application/json' },
    })
    .then(response => {
        if (!response.ok) throw { message: response.statusText };
        return response.json();
    })
    .then(json => res.send({ error: null, status: json.status, response: json }))
    .catch(err  => res.send({ error: err,  status: err,         response: ""  }));
});

var server = app.listen(4012, function() {
    console.log('listening: 4012');
});
