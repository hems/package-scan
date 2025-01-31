var fs = Npm.require('fs');
var readline = Npm.require('readline');
var semver = Npm.require('semver');

var url = 'https://raw.githubusercontent.com/east5th/package-scan/master/data/alerts.json';

var alerts = [];
var packages = [];

function processLine(line) {
    line = line.trim();
    if (line.length) {
        var split = line.split('@');
        packages.push({
            name: split[0],
            version: split[1]
        });
    }
}

function skipPackage(package) {
    var settings = Meteor.settings["package-scan"] || {};
    var ignore = settings.ignore || [];
    return _.contains(ignore, package);
}

function scanPackages() {
    packages.forEach(function(package) {
        if (skipPackage(package.name)) {
            return;
        }
        (alerts[package.name] || []).forEach(function(alert) {
            if (semver.satisfies(package.version, alert.range)) {
                console.warn(package.name + '@' + package.version + ' (' + alert.range + '): ' + alert.alert);
                if (alert.links && alert.links.length) {
                  alert.links.forEach(function(link) {
                    console.warn('  '+link.name+': '+link.url);
                  });
                }
            }
        });
    });
}

Meteor.startup(function() {
    HTTP.get(url, function(err, res) {
        if (err) {
            console.error('package-scan: ', err);
            return {};
        }

        try {
            alerts = JSON.parse(res.content);
        } catch (e) {
            console.error('package-scan: Unable to parse alerts.json!');
            return {};
        }

        if (process.env.PWD) {
          var path = process.env.PWD + '/.meteor/versions';
        } else {
          var path = process.cwd().split('.meteor')[0] + '.meteor/versions';
        }
        
        readline.createInterface({
            input: fs.createReadStream(path),
            output: process.stdout,
            terminal: false
        })
        .on('line', processLine)
        .on('close', scanPackages);
    });
});
