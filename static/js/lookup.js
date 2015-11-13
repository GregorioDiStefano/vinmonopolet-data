angular.module('VinData', ['ui.bootstrap', "chart.js", "ngTable"])

    .controller("PriceDiffTable", function($scope, $http, $filter, NgTableParams) {
        $scope.tableParams = new NgTableParams({ page : 1, sorting : { varenavn : "asc" } }, {
            defaultSort: { varenavn: "asc" },
            getData: function ($defer, params) {
                $http.get("/api/get/new_prices.json")
                    .then(function(res) {
                        var data = res.data
                        var ordered = params.sorting() ? $filter('orderBy')(data, params.orderBy()) : data;
                        $defer.resolve(ordered)
                    })
            }
        })
    })

    .controller("NewProductsTable", function($scope, $http, $filter, NgTableParams) {
        $scope.tableParams = new NgTableParams({ page : 1, sorting : { varenavn : "asc" } }, {
            defaultSort: { varenavn: "asc" },
            getData: function ($defer, params) {
                $http.get("/api/get/new_products.json")
                    .then(function(res) {
                        var data = res.data
                        var ordered = params.sorting() ? $filter('orderBy')(data, params.orderBy()) : data;
                        $defer.resolve(ordered)
                    })
            }
        })
    })


    .controller("TypeaheadCtrl", function($scope, $http, limitToFilter) {




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
        $scope.selected_item = item
        return $http.get("/api/get/item_info.json?i="+item.split(",")[0]).then(function(response){
            $scope.item_data = response.data
            console.log($scope.item_data)
            update_graph(1)
            }
        )}


        $scope.chart_options = { scaleShowLabels : false, animation: false }

        $scope.labels = ["2015-01-01", "2015-02-01", "2015-03-01", "2015-04-01", "2015-05-01", "2015-06-01", new Date(2015, 5, 1), new Date(2015, 6, 1)];
        $scope.data = [
            [65, 59, 80, 81, 56, 55, 40]
        ];

        $scope.onClick = function (points, evt) {
        console.log(points, evt);
            $scope.$apply();
        }

        function update_graph(data) {
            $scope.labels = ["2015-03-01", "2015-04-01", "2015-05-01", "2015-06-01", "2015-07-01", "2015-08-01", new Date(2015, 10, 1), new Date(2015, 11, 1)];

        $scope.data = [
            [15, 79, 10, 87, 16, 35, 12]
        ];
console.log("Updated!")
        }
});


