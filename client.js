/* jshint node: true */
var Manager = require('./jam').Manager;
var CFG = require('config');

var Client = function() {
    var config = CFG || {};
    if (typeof config.COLLECTIONS_PATH !== "string") {
        config.COLLECTIONS_PATH = "./collections.js";
    }
    var collections = require(config.COLLECTIONS_PATH);

    var self = this;
    self._manager = new Manager(config);

    self.getOrCreateNamespace = function(name, attrs) {
        return self._manager.getOrCreate(name, attrs);
    };

    self.updateNamespace = function(name, attrs) {
        return self.getOrCreateNamespace(name).then(function(ns) {
            return ns.update(attrs);
        });
    };

    self.listNamespaces = function() {
        return self._manager.list();
    };

    self.bootstrap = function() {
        var attrs = {};
        var namespace = config.NAMESPACE;
        var owner = 'user-osf-' + config.ADMIN_GUID;
        if (owner) {
            attrs.permissions = {
                'system-system-system': 'ADMIN'
            };
            attrs.permissions[owner] = 'ADMIN';
        }
        this.getOrCreateNamespace(namespace, attrs).then(function(ns) {
            console.log('Bootstrapping ', namespace);
            collections.forEach(function(col) {
                console.log('Bootstrapping collection: ', col.id);
                ns.getOrCreate(namespace + '.' + col.id, col.attrs).then(function(collection) {
                    console.log('Updating collection: ', col.id);
                    collection.update(col.attrs).then(function() {
                        if (col.id === 'accounts') {
                            // Wait until the update is done to run userify, otherwise the
                            // post-update cleanup will remove the /schema and /plugins changes
                            collection.userify();
                        }
                    });
                });
            });
        });
    };
};

module.exports = Client;
