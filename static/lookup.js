(function() {
angular.module('plunker', ['ui.bootstrap'])
    .controller("TypeaheadCtrl", function($scope, $http, limitToFilter) {

  $scope.cities = function(cityName) {
    return $http.get("/products?s="+cityName).then(function(response){
        console.log(response)
        return limitToFilter(response.data, 15);
    });
  };
})
}());
