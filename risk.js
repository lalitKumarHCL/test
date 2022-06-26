var request = require('request');

var headers = 
    '{content-type : application/pdf}';

var dataString = '{"requestType" : "getOrganizationRiskReport", "userKey": "7eef32a2d8ee4431b2c048b4f49227a7c03aa072b8fb4415b209d78f0050d37a", "orgToken" : "fceb37eb-3ffc-4f2b-b80e-bd5e865d9a40"}';

var options = {
    url: 'https://saas.whitesourcesoftware.com/api/v1.3',
    method: 'POST',
    headers: headers,
    body: dataString
};

function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
        console.log(body);
    }
}

request(options, callback);
