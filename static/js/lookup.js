angular.module('VinData', ['ui.bootstrap', "chart.js", "ngTable"])
    .controller('ParentCtrl', function($scope) {
        $scope.$on('HideTable',function(event, data) {
            if (data)
                $scope.hide_table = true;
            else {
                console.log("Hide table")
                $scope.hide_table = false;
            }
        });
    })

    .controller("PriceDiffTable", function($scope, $controller, $http, $filter, NgTableParams) {
        $controller('ParentCtrl', {$scope: $scope});
        $scope.tableParams = new NgTableParams(
            {
                sorting : { varenavn : "asc" },
                count: 15,
                page: 1
            },
            {
                defaultSort: { varenavn: "asc" },
                getData: function ($defer, params) {
                    $http.get("/api/get/new_prices.json")
                        .then(function(res) {
                            var data = res.data
                            var ordered = params.sorting() ? $filter('orderBy')(data, params.orderBy()) : data;
                            params.total(ordered.length)
                            $defer.resolve(ordered.slice((params.page() - 1) * params.count(), params.page() * params.count()))
                        })
            }
        })
    })

    .controller("NewProductsTable", function($scope, $controller, $http, $filter, NgTableParams) {
        $controller('ParentCtrl', {$scope: $scope});

        $scope.tableParams = new NgTableParams(
            {
                sorting : { varenavn : "asc" },
                count: 25,
                page : 1
            },
            {
                defaultSort: { varenavn: "asc" },
                getData: function ($defer, params) {
                    $http.get("/api/get/new_products.json")
                        .then(function(res) {
                            var data = res.data
                            var ordered = params.sorting() ? $filter('orderBy')(data, params.orderBy()) : data;
                            params.total(ordered.length)
                            $defer.resolve(ordered.slice((params.page() - 1) * params.count(), params.page() * params.count()))
                        })
            }
        })
    })


    .controller("TypeaheadCtrl", function($scope, $rootScope, $http, limitToFilter) {
        $scope.selected_item = undefined
        $scope.item_data = undefined

        $scope.product = function(product) {
            return $http.get("/api/get/products.json?s="+product).then(function(response){
                response.data.forEach(function(e, idx, array)
                {
                    response.data[idx] = e[0] + ", " + e[1]
                })
                return limitToFilter(response.data, 15);
            });
        };

        $scope.set_item = function(item) {
            $rootScope.$broadcast('HideTable', true);
            $scope.selected_item = item
            return $http.get("/api/get/item_info.json?i="+item.split(",")[0]).then(function(response){
                $scope.item_data = response.data
                console.log($scope.item_data)
                $rootScope.$broadcast("ShowGraph", $scope.item_data)
            }
        )}
    })

    .controller("Graph", function($scope, $controller, $rootScope, $http) {
        $controller('ParentCtrl', {$scope: $scope});

        $scope.back_to_main = function() {
            $rootScope.$broadcast("HideTable", false)
        }

        $scope.$on('ShowGraph',function(event, data) {
            console.log("Populate graph with: ", data)
            item_name = Object.keys(data)
            item_data = data[item_name]
            update_graph(item_name, item_data)
        })


        function update_graph(item_name, item_data) {


            $scope.chart_options = { scaleShowLabels : false,
                                     animation: false,
                                     responsive: true,
                                     maintainAspectRatio: false,
                                     scaleOverride : true
                                   }
            $scope.labels = []
            $scope.data = []
            var tmp_data = []

            item_data.forEach(function(e, idx) {
                $scope.labels.push(e["date"])
                tmp_data.push(e["price"])
            })

            //calculate start value
            var y_start = tmp_data.sort()[0] * 0.80
            $scope.chart_options["scaleStartValue"] = y_start

            //calculate max value
            var y_max = tmp_data.sort()[(tmp_data.length - 1)] * 1.20
            $scope.chart_options["scaleStepWidth"] = y_max

            $scope.chart_options["scaleSteps"] = .5

            $scope.data.push(tmp_data)

            }
        })


