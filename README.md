# vinmonopolet-data

Vinmonopolet (Norway's alcohol comission) shares the data of all their products online. 

I thought it would be fun to use AngularJS + NodeJS to make a webapp that shows interesting trends on the data. 

The way it works is simple: 
  - daily cronjob downloads the latests data and imports it to a sqlite db
  - NodeJS running on the backend, does all the backend work: SQL queries, loading data, JSON API
  - AngularJS frontend, requesting JSON data from the backend
  - ng-Table displaying the data in a pretty, orderly fashio
  - Chartjs (angular edition) showing the price history

Still a work in progress! 
