angular.module( 'ripplecharts.markets', [
  'ui.state',
  'ui.bootstrap',
  'ui.route'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'markets-custom', {
    url: '/markets/:base/:trade',
    views: {
      "main": {
        controller: 'MarketsCtrl',
        templateUrl: 'markets/markets.tpl.html'
      }
    },
    data:{ pageTitle: 'Live Chart' },
    resolve : {
      gateInit : function (gateways) {
        return gateways.promise;
      }
    }
  })
  .state( 'markets', {
    url: '/markets',
    views: {
      "main": {
        controller: 'MarketsCtrl',
        templateUrl: 'markets/markets.tpl.html'
      }
    },
    data:{ pageTitle: 'Live Chart' },
    resolve : {
      gateInit : function (gateways) {
        return gateways.promise;
      }
    }
  });
})

.controller( 'MarketsCtrl', function MarketsCtrl( $scope, $state, $location, gateways) {

  if ($state.params.base && $state.params.trade) {
    $scope.base = $state.params.base.split(":");
    $scope.base = {
      currency: $scope.base[0],
      issuer: $scope.base[1] ? $scope.base[1]:""
    };
    $scope.trade = $state.params.trade.split(":");
    $scope.trade = {
      currency: $scope.trade[0],
      issuer: $scope.trade[1] ? $scope.trade[1]:""
    };

  } else {
    //load settings from session, local storage, options, or defaults
    $scope.base  = store.session.get('base') || store.get('base') ||
      Options.base || {currency:"XRP", issuer:""};

    $scope.trade = store.session.get('trade') || store.get('trade') ||
      Options.trade || {currency:"USD", issuer:"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"};

    var hash = 'markets/' + $scope.base.currency +
      ($scope.base.issuer ? ':' + $scope.base.issuer : '') +
      '/' + $scope.trade.currency +
      ($scope.trade.issuer ? ':' + $scope.trade.issuer : '');

    //use replace so that the
    //back button works properly
    $location.path(hash).replace();
    return;
  }

  $scope.chartType = store.session.get('chartType') || store.get('chartType') ||
    Options.chartType || "line";

  $scope.interval  = store.session.get('interval') || store.get('interval') ||
    Options.interval  || "15m";

  $scope.range  = store.session.get('range') || store.get('range') ||
    Options.range  || {name: "1d", start: moment.utc().subtract(1, 'day')._d, end: moment.utc()._d };

  var loaded = false;

  $scope.$watch('theme', function(){
    dropdownB = ripple.currencyDropdown(gateways).selected($scope.trade)
      .on("change", function(d) {
        $scope.trade = d;
        if ($scope.range.name === "max") updateMaxrange();
        updatePair();
      });
    dropdownA = ripple.currencyDropdown(gateways).selected($scope.base)
      .on("change", function(d) {
        $scope.base = d;
        if ($scope.range.name === "max") updateMaxrange();
        updatePair();
      });

    d3.select("#base").call(dropdownA);
    d3.select("#quote").call(dropdownB);
  });

  function updatePair() {
    store.set('base',  $scope.base);
    store.set('trade', $scope.trade);

    store.session.set('base',  $scope.base);
    store.session.set('trade', $scope.trade);

    var current = window.location.hash;
    var hash = 'markets/' + $scope.base.currency +
      ($scope.base.issuer ? ':' + $scope.base.issuer : '') +
      '/' + $scope.trade.currency +
      ($scope.trade.issuer ? ':' + $scope.trade.issuer : '');

    current = current.substr(current.indexOf('markets'));

    if (hash !== current) {
      window.location.hash = '/' + hash;
    }
  }

  d3.select("#flip").on("click", function(){ //probably better way to do this
    dropdownA.selected($scope.trade);
    dropdownB.selected($scope.base);
    loaded = false;
    d3.select("#base").call(dropdownA);
    d3.select("#quote").call(dropdownB);
    loaded = true;

    swap         = $scope.trade;
    $scope.trade = $scope.base;
    $scope.base  = swap;
    updatePair();
  });

  //set up the range selector
  var ranges = d3.select("#range").attr("class","selectList");
  ranges.append("label").html("Range:");
  var range = ranges.selectAll("a")
    .data([
      //{name: "5s",  interval:"second", multiple:5,  offset: function(d) { return d3.time.hour.offset(d, -1); }},//disableding purposes only
      {name: "12h",  interval:"minute", multiple:5,   offset: function(d) { return d3.time.hour.offset(d, -12); }},
      {name: "1d",  interval:"minute",  multiple:15,  offset: function(d) { return d3.time.day.offset(d, -1); }},
      {name: "3d",  interval:"minute",  multiple:30,  offset: function(d) { return d3.time.day.offset(d, -3); }},
      {name: "1w",  interval:"hour",    multiple:1,   offset: function(d) { return d3.time.day.offset(d, -7); }},
      {name: "2w",  interval:"hour",    multiple:2,   offset: function(d) { return d3.time.day.offset(d, -14); }},
      {name: "1m",  interval:"hour",    multiple:4,   offset: function(d) { return d3.time.month.offset(d, -1); }},
      {name: "3m",  interval:"day",     multiple:1,   offset: function(d) { return d3.time.month.offset(d, -3); }},
      {name: "6m",  interval:"day",     multiple:1,   offset: function(d) { return d3.time.month.offset(d, -6); }},
      {name: "1y",  interval:"day",     multiple:3,   offset: function(d) { return d3.time.year.offset(d, -1); }},
      {name: "max",  interval:"day",    multiple:3,   offset: function(d) { return getStartdate($scope.base, $scope.trade) }}
      ])
    .enter().append("a")
    .attr("href", "#")
    .classed("selected", function(d) {
      if (d.name === $scope.range.name){
        if ($scope.range.name !== "custom"){
          var now = moment.utc();
          $scope.range.start = d.offset(now);
          $scope.range.end = new Date(now);
        }
        return true;
      }
    })
    .text(function(d) { return d.name; })
    .on("click", function(d) {
      d3.event.preventDefault();
      var that = this,
          now  = moment.utc();
      updateScopeStore("range", {name: d.name});
      range.classed("selected", function() { return this === that; });
      $("#start")
        .datepicker('option', 'maxDate', new Date(moment(now).subtract(1,'day')))
        .datepicker('setDate', d.offset(now))
        .hide();
      $("#end")
        .datepicker('option', 'minDate', d.offset(now))
        .datepicker('setDate', new Date(now))
        .hide();
      $("#custom").removeClass('selected');
      intervals.selectAll("a")
        .classed("selected", function(s) {
          if (s.multiple === d.multiple && s.interval === d.interval){
            updateScopeStore("interval", s.name);
            return true;
          }
          else return false;
        })
        .classed("disabled", function(s){
          return selectIntervals(d.offset(now), now, s);
        });
      d.live = true;
      priceChart.load($scope.base, $scope.trade, d);
    });

  //set up date selector
  ranges.append("a").html("custom").attr('href', '#').attr('id', 'custom')
    .data([{name: 'custom'}])
    .classed("selected", function(d) { return d.name === $scope.range.name; })
    .on('click', function(d){
      var data = d3.select("#range .selected").datum(),
          that = this,
          now  = moment.utc();
      $(this).addClass('selected');
      range.classed("selected", function() { return this === that; });
      d3.event.preventDefault();
      if ($scope.range.name !== "custom"){
        var stored_range = {
          name  : "custom",
          start : data.offset(now),
          end   : now
        };
        updateScopeStore("range", stored_range);
      }
      $("#start").toggle();
      $("#end").toggle();
    });

  ranges.append("div").attr('id', 'dates');
  d3.select('#dates').append("input").attr('type', 'text')
    .attr('id', 'start').attr('class', 'datepicker')
    .property('maxLength', 8);
  d3.select('#dates').append("input").attr('type', 'text')
    .attr('id', 'end').attr('class', 'datepicker')
    .property('maxLength', 8);
  if(!$("#custom").hasClass("selected")){
    $("#start").hide();
    $("#end").hide();
  }

  $("#end" ).datepicker({
    maxDate: new Date($scope.range.end),
    minDate: new Date($scope.range.start),
    defaultDate: $scope.range.end,
    dateFormat: 'mm/dd/y',
    onSelect: function(dateText) {
      var start = new Date($scope.range.start),
          end   = new Date(dateText);

      if (end.getFullYear() < 1999) {
        end.setFullYear(end.getFullYear() + 100);
      }

      $("#start").datepicker('option', 'maxDate', new Date(moment(end).subtract(1,"day")));
      dateChange(start, end);
    }
  }).datepicker('setDate', new Date($scope.range.end));

  $("#start" ).datepicker({
    minDate: new Date("1/1/2013"),
    maxDate: new Date(moment($scope.range.end).subtract(1,"day")),
    defaultDate: $scope.range.start,
    dateFormat: 'mm/dd/y',
    onSelect: function(dateText) {
      var start = new Date(dateText),
          end   = new Date($scope.range.end);

      if (start.getFullYear() < 1999) {
        start.setFullYear(start.getFullYear() + 100);
      }

      $("#end").datepicker('option', 'minDate', new Date(moment(start).add(1,"day")));
      dateChange(start, end);
    }
  }).datepicker('setDate', new Date($scope.range.start));

  function dateChange(start, end){
    var selected = false;
    updateScopeStore("range", {name: 'custom', start: start, end: end});
    intervals.selectAll("a")
      .classed("disabled", function(d){ return selectIntervals(start, end, d); })
      .classed("selected", function(d){
        if( selected === false && !selectIntervals(start, end, d)){
          selected = true;
          updateScopeStore("interval", d.name);
          var s = $.extend(true, {}, d);
          s.live = false;
          s.start = moment.utc(start);
          s.end = moment.utc(end);
          priceChart.load($scope.base, $scope.trade, s);
          return true;
        }
      });
  }

  //set up the interval selector
  var intervals = d3.select("#interval").attr("class","selectList");
  intervals.append("label").html("Interval:");
  var interval = intervals.selectAll("a")
    .data([
      {name: "5m",  interval:"minute",  multiple:5 },
      {name: "15m", interval:"minute",  multiple:15 },
      {name: "30m", interval:"minute",  multiple:30 },
      {name: "1h",  interval:"hour",    multiple:1 },
      {name: "2h",  interval:"hour",    multiple:2 },
      {name: "4h",  interval:"hour",    multiple:4 },
      {name: "1d",  interval:"day",     multiple:1 },
      {name: "3d",  interval:"day",     multiple:3 },
      {name: "7d",  interval:"day",     multiple:7 },
      {name: "1M",  interval:"month",   multiple:1 }
      ])
    .enter().append("a")
    .attr("href", "#")
    .classed("selected", function(d) { return d.name === $scope.interval; })
    .classed("disabled", function(d) {
      var now    = moment.utc(),
          range  = d3.select("#range .selected").datum(),
          offset, start, end;
      if (range.name !== "custom") {
        start = range.offset(now);
        end = now;
      }
      else{
        start = $scope.range.start;
        end = $scope.range.end;
      }
      return selectIntervals(start, end, d); })
    .text(function(d) { return d.name; })
    .on("click", function(d) {
      var rangeList, data;
      d3.event.preventDefault();
      if (!this.classList.contains("disabled")) {
        var that  = this,
            range = $scope.range;
        if (range.name !== "custom") {
          rangeList = ranges.selectAll("a")[0];
          for (var i=0; i<rangeList.length; i++){
            data = d3.select(rangeList[i]).datum();
            if (data.name === range.name) {
              d.offset = data.offset;
              break;
            }
          }

          d.live = true;
        }
        else {
          d.start = range.start;
          d.end = range.end;
          d.live = false;
        }
        updateScopeStore("interval", d.name);
        interval.classed("selected", function() { return this === that; });
        priceChart.load($scope.base, $scope.trade, d);
      }
    });

  //set up the chart type selector
  var chartType = d3.select("#chartType").attr("class","selectList").selectAll("a")
    .data(["line", "candlestick"])
    .enter().append("a")
    .attr("href", "#")
    .attr("title", "Toggle candlestick/line")
    .classed('lineGraphic', function(d) { return d === 'line'; })
    .classed('candlestickGraphic', function(d) { return d === 'candlestick'; })
    .classed("selected", function(d) { return d === $scope.chartType; })
    .text(function(d) { return d; })
    .on("click", function(d) {
      d3.event.preventDefault();
      var that = this;
      store.set("chartType", d);
      store.session.set("chartType", d);

      chartType.classed("selected", function() { return this === that; });
      chartType.selected = d;
      priceChart.setType(d);
    });

//set up the price chart
  var priceChart = new PriceChart ({
    id     : "priceChart",
    url    : API,
    type   : $scope.chartType,
    live   : true,
    resize : true
  });

  var toCSV = d3.select("#toCSV");
  toCSV.on('click', function(){
    if (toCSV.attr("disabled")) return;
    var data = priceChart.getRawData();
    var list = [];

    for (var i=0; i<data.length; i++) {
      list.push(JSON.parse(JSON.stringify(data[i])));
    }

    var csv = jsonToCSV(list);
    if (!!Modernizr.prefixed('requestFileSystem', window)) {
      var blob  = new Blob([csv], {'type':'application/octet-stream'});
      this.href = window.URL.createObjectURL(blob);
    } else {
      this.href = "data:text/csv;charset=utf-8," + escape(csv);
    }

    this.download = $scope.base.currency+"_"+$scope.trade.currency+"_historical.csv";
    this.target   = "_blank";
  });

  priceChart.onStateChange = function(state) {
    if (state=='loaded') toCSV.style("opacity",1).attr("disabled",null);
    else toCSV.style("opacity",0.3).attr("disabled",true);
  };

  function selectIntervals(start, end, d){
    var diff = Math.abs(moment(start).diff(end))/1000,
        num;
    switch (d.name){
      case "5m":
        num = diff/(300);
        break;
      case "15m":
        num = diff/(900);
        break;
      case "30m":
        num = diff/(1800);
        break;
      case "1h":
        num = diff/(3600);
        break;
      case "2h":
        num = diff/(7200);
        break;
      case "4h":
        num = diff/(14400);
        break;
      case "1d":
        num = diff/(86400);
        break;
      case "3d":
        num = diff/(259200);
        break;
      case "7d":
        num = diff/(604800);
        break;
      case "1M":
        if (diff >= 31500000){
          num = 100;
        }
        else num = 0;
        break;
      default:
        return true;
    }
    if(num <= 366 && num >= 25) return false;
    else return true;
  }

  function getStartdate(base, counter){
    var gatewayList;
    var minDate = new Date();
    var candidate;
    var changed = false;

    if (base.issuer) {
      gatewayList = gateways.getIssuers(base.currency);
      gatewayList.forEach(function(gateway){
        if (base.issuer === gateway.account && gateway.start_date) {
          candidate = new Date(gateway.start_date);
          if (candidate < minDate) {
            minDate = candidate;
            changed = true;
          }
        }
      });
    }
    if (counter.issuer) {
      gatewayList = gateways.getIssuers(counter.currency);
      gatewayList.forEach(function(gateway){
        if (counter.issuer === gateway.account && gateway.start_date) {
          candidate = new Date(gateway.start_date);
          if (candidate < minDate) {
            minDate = candidate;
            changed = true;
          }
        }
      });
    }

    if (!changed) return new Date('2013-1-1');
    else return minDate;
  }

  function updateMaxrange(){
    var start = getStartdate($scope.base, $scope.trade);
    var now = moment.utc();
    $("#start")
      .datepicker('option', 'maxDate', new Date(moment(now).subtract(1,'day')))
      .datepicker('setDate', start)
    $("#end")
      .datepicker('option', 'minDate', start)
      .datepicker('setDate', new Date(now))
  }

  function updateScopeStore(option, value){
    $scope[option] = value;
    store.set(option, value);
    store.session.set(option, value);
  }

  loaded = true;

  //set up the order book
  function emitHandler (type, data) {
    if (type=='spread') {
      document.title = data.bid+"/"+data.ask+" "+$scope.base.currency+"/"+$scope.trade.currency;
    }
  }

  book = new OrderBook ({
    chartID : "bookChart",
    tableID : "bookTables",
    remote  : remote,
    resize  : true,
    emit    : emitHandler
  });

//set up trades feed
  tradeFeed = new TradeFeed({
    id     : "tradeFeed",
    url    : API
  });

//single function to reload all feeds when something changes
  function loadPair() {

    var range    = d3.select("#range .selected").datum(),
        interval = d3.select("#interval .selected").datum();

    if (d3.select("#range .selected").text() === "custom"){
      interval.live = false;
      interval.start = $scope.range.start;
      interval.end = $scope.range.end;
    }
    else {
      interval.live = true;
      interval.offset = range.offset;
    }

    priceChart.load($scope.base, $scope.trade, interval);
    book.getMarket($scope.base, $scope.trade);
    tradeFeed.loadPair ($scope.base, $scope.trade);
    mixpanel.track("Price Chart", {
      "Base Currency"  : $scope.base.currency  + ($scope.base.issuer  ? "."+$scope.base.issuer  : ""),
      "Trade Currency" : $scope.trade.currency + ($scope.trade.issuer ? "."+$scope.trade.issuer : ""),
      "Interval"       : interval.name,
      "Chart Type"     : priceChart.type
    });
  }


//stop the listeners when leaving page
  $scope.$on("$destroy", function(){
    priceChart.suspend();
    book.suspend();
    tradeFeed.suspend();
  });


//reload data when coming back online
  $scope.$watch('online', function(online) {
    if (online) {
      remote.connect();
      setTimeout(function(){ //put this in to prevent getting "unable to load data"
        loadPair();
      }, 100);


    } else {
      remote.disconnect();
    }
  });
});
