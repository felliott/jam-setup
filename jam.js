/* jshint node: true, esnext: true*/
var Promise = require('bluebird'); // jshint ignore: line
var request = require('request-promise');

var CONTENT_TYPE = 'application/vnd.api+json';
var PATCH_CONTENT_TYPE = 'application/vnd.api+json ext="jsonpatch";';

var USER_SCHEMA = {
    'type': 'jsonschema',
    'schema': {
        'id': '/',
        'type': 'object',
        'properties': {
            'password': {
                'id': 'password',
                'type': 'string',
                'pattern': '^\\$2b\\$1[0-3]\\$\\S{53}$'
            }
        },
        'required': ['password']
    }
};

function Manager(config) {
    var self = this;

    self._token = process.env.JAM_TOKEN || config.JAM_TOKEN;
    self._url = `${process.env.JAM_URL || config.JAM_URL}/v1/namespaces`;


    function Collection(namespace, name) {
        var self = this;
        self._name = name;
        self._namespace = namespace;
        self._token = namespace._token;

        var shortname = name.substring(name.indexOf('.') +1);
        self._url = `${config.JAM_URL}/v1/id/collections/${self._namespace._name}.${shortname}`;

        self.get = function(id) {
            return request.get({
                json: true,
                url: self._url + `/documents/${id}`,
                headers: {
                    Authorization: self.token
                }
            });
        };

        self.create = function(id, attrs) {
            return request.post({
                json: true,
                url: self._url + '/documents',
                body: {
                    data: {
                        id: id,
                        type: 'documents',
                        attributes: attrs || {}
                    }
                },
                headers: {
                    Authorization: self._token,
                    'Content-Type': CONTENT_TYPE
                }
            });
        };

        self.update = function(patchOrData) {
            if (!Array.isArray(patchOrData))
                patchOrData = {
                    data: {
                        id: self._name,
                        attributes: patchOrData,
                        type: 'collections'
                    }
                };

            return request.patch({
                json: true,
                url: self._url,
                body: patchOrData,
                headers: {
                    Authorization: self._token,
                    'Content-Type': Array.isArray(patchOrData) ? PATCH_CONTENT_TYPE : CONTENT_TYPE
                }
            });
        };

        self.userify = function(createdIsOwner) {
            return self.update([{
                op: 'add',
                path: '/schema',
                value: USER_SCHEMA
            }, {
                op: 'add',
                path: '/flags/userCollection',
                value: true
            }, {
                op: 'add',
                path: '/flags/createdIsOwner',
                value: !createdIsOwner
            }]);
        };

        return request.get({
            json: true,
            url: self._url,
            headers: {
                Authorization: self._token
            }
        }).then(function() {
            return self;
        });
    }


    function Namespace(name, token) {
        var self = this;

        self._name = name;
        self._token = token;
        self._url = `${config.JAM_URL}/v1/id/namespaces/${name}`;

        self.get = function(collection) {
            return new Collection(self, collection);
        };

        self.create = function(collection, attrs) {
            return request.post({
                json: true,
                url: self._url + '/collections',
                body: {
                    data: {
                        id: collection,
                        type: 'collections',
                        attributes: attrs || {}
                    }
                },
                headers: {
                    Authorization: self._token,
                    'Content-Type': CONTENT_TYPE
                }
            }).then(_ => self.get(collection));
        };

        self.getOrCreate = function(collection, attrs) {            
            return new Promise(function(resolve) {
                self
                    .get(collection)
                    .then(function(col) {
                        resolve(col);
                    })
                    .catch(e => self.create(collection, attrs).then(function(col) {
                        resolve(col);
                    }));
            });
        };

        self.update = function(patchOrData) {
            if (!Array.isArray(patchOrData))
                patchOrData = {
                    data: {
                        id: self._name,
                        type: 'namespaces',
                        attributes: patchOrData
                    }
                };

            return request.patch({
                json: true,
                url: self._url,
                body: patchOrData,
                headers: {
                    Authorization: self._token,
                    'Content-Type': Array.isArray(patchOrData) ? PATCH_CONTENT_TYPE : CONTENT_TYPE
                }
            });
        };

        self.list = function() {
            return request.get({
                json: true,
                url: self._url + '/collections',
                headers: {
                    Authorization: self._token
                }
            }).then(data => data.data);
        };

        self.delete = function(name) {
            return request({
                method: 'DELETE',
                json: true,
                url: `${config.JAM_URL}/v1/id/collections/${name}`,
                headers: {
                    Authorization: self._token
                }
            });
        };

        return request.get({
            json: true,
            url: self._url,
            headers: {
                Authorization: self._token
            }
        }).then(function() {
            return self;
        });
    }



    self.get = function(namespace) {
        return new Namespace(namespace, self._token);
    };

    self.getOrCreate = function(namespace, attrs) {
        return new Promise(function(resolve, reject) {
            self.get(namespace).then(function(ns) {
                resolve(ns);
            }, function() {
                return self.create(namespace, attrs).then(function(ns) {
                    resolve(ns);
                });
            });
        });
    };

    self.create = function(namespace, attrs) {
        return request.post({
            json: true,
            url: self._url,
            body: {
                data: {
                    id: namespace,
                    type: 'namespaces',
                    attributes: attrs || {}
                }
            },
            headers: {
                Authorization: self._token,
                'Content-Type': CONTENT_TYPE
            }
        }).then(_ => self.get(namespace));
    };

    self.list = function() {
        return request.get({
            json: true,
            url: self._url,
            headers: {
                Authorization: self._token
            }
        });
    };


}

module.exports = {
    Manager: Manager
};
