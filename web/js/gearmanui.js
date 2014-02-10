/*
 * Configure services
 */

var gearmanui = angular.module('gearmanui', ['ngResource'])

    // Configure routes
    .config(['$routeProvider', function($routeProvider) {
        $routeProvider
            .when('/status', {templateUrl:'status'})
            .when('/workers', {templateUrl:'workers'})
            .when('/servers', {templateUrl:'servers'})
            .when('/log', {templateUrl:'log'})
            .otherwise({redirectTo:'/status'})
    }])

    // Service : Gearman info callback
    .factory('GearmanInfo', function($resource) {
        return $resource('info', {});
    })

    // Service : Gearman log callback
    .factory('GearmanLog', function($resource) {
        var wrapper = {};
        wrapper.query = function(func) {

            function getQueryParams(qs) {
                qs = qs.split("+").join(" ");

                var params = {}, tokens,
                    re = /[?&]?([^=]+)=([^&]*)/g;

                while (tokens = re.exec(qs)) {
                    params[decodeURIComponent(tokens[1])]
                        = decodeURIComponent(tokens[2]);
                }

                return params;
            }

            var route = getQueryParams(window.location.hash);
            if (!route['#/log?worker']) {
                route = {'#/log?worker':''}
            }

            $resource('data?worker=:worker', {
                worker: route['#/log?worker']
            }).query(func);
        };

        return wrapper;
    })

    // Service : Handle server errors
    .factory('GearmanErrorHandler', function() {

        var wrapper = {};

        wrapper.get = function(data) {
            var errors = [];

            data.forEach(function(element, index, array) {
                if ('error' in element) {
                    errors.push(element.error);
                }
            });

            // Make sure that a list containing the same errors is always shown in the same order.
            return errors.sort();
        };

        return wrapper;
    })

    .factory('GearmanLogHandler', function() {

        var wrapper = {};
        wrapper.log = function(arg) {

        }
        return wrapper;

    })

    // Service : Transfort server incomming data info model tables.
    .factory('GearmanInfoHandler', function() {

        var wrapper = {};

        // Servers Table
        wrapper.servers = function(data) {
            var serversTable = [];
            data.forEach(function(element, index, array) {
                serversTable[index] = {
                    name: element.name,
                    addr: element.addr,
                    version: element.version,
                    up: element.up ? "Running" : "Unreachable"
                };

                serversTable[index].nb_workers = null;
                if (element.up && 'workers' in element) {
                    serversTable[index].nb_workers = element.workers.length;
                }

                serversTable[index].rowClass = element.up ? '' : 'error';
            });

            return serversTable.sort(function(s1, s2) {
                return s1.name.localeCompare(s2);
            });
        };

        // Workers Table
        wrapper.workers = function(data) {
            var counter = 0;
            var workersTable = [];

            data.forEach(function(element, index, array) {
                if (element.up && 'workers' in element) {
                    for (var i=0 ; i < element.workers.length ; i++) {
                        workersTable[counter++] = {
                            id: element.workers[i].id,
                            fd: element.workers[i].fd,
                            ip: element.workers[i].ip,
                            abilities: element.workers[i].abilities.join(', '),
                            server: element.name
                        }
                    }
                }
            });

            // Default order: file descriptor
            return workersTable.sort(function(w1, w2) {
                return w1.fd - w2.fd;
            });
        };

        // Status table
        wrapper.status = function(data) {
            var f;
            var counter = 0;
            var statusTable = [];

            data.forEach(function(element, index, array) {
                for (f in element.status) {
                    statusTable[counter++] = {
                        function: f,
                        queued: element.status[f].in_queue,
                        running: element.status[f].jobs_running,
                        workers: element.status[f].capable_workers,
                        server: element.name
                    }
                }
            });

            // Default order: function name, then server name.
            return statusTable.sort(function(s1, s2) {
                if (s1.function == s2.function) {
                    return s1.server.localeCompare(s2.server);
                }
                else {
                    return s1.function.localeCompare(s2.function);
                }
            });
        };

        return wrapper;
    });


/*
 * Controllers
 *
 */
function InfoCtrl($scope, GearmanSettings, GearmanInfo, GearmanLog, GearmanLogHandler, GearmanInfoHandler, GearmanErrorHandler) {

    /*
     * TODO Handle communication errors.
     */
    function setInfo() {
        GearmanInfo.query(function(data) {
            // Update model with the massaged data.
            $scope.errors = GearmanErrorHandler.get(data);
            $scope.status = GearmanInfoHandler.status(data);
            $scope.workers = GearmanInfoHandler.workers(data);
            $scope.servers = GearmanInfoHandler.servers(data);
        });

        GearmanLog.query(function(data){
            $scope.log = GearmanLogHandler.log(data);
            var log = document.getElementById('log-textarea');
            if (log) {
                log.textContent = data[0]['data'];
            }

        });
    }

    window.setInterval(setInfo, GearmanSettings.refreshInterval * 1000);
    setInfo();
}


function NavigationCtrl($scope, $location) {
    // Set menu active class for the current URL
    $scope.getClass = function(path) {
        if ($location.path().substr(0, path.length) == path) {
            return "active"
        } else {
            return ""
        }
    }
}