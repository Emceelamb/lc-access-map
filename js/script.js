var apiKey = 'AIzaSyBF-0XKnIolLVsJZBXw4JWmoij1kdvxPEg';
var ctrlPressed = false;
var altPressed = false;

// ['Lat', 'Long', 'Name'],
var myMarkers = [
  [40.77210813, -73.98290455, "Access-A-Ride - Columbus Avenue, East"],
  [40.77207156, -73.98356438, "Accessible Entrance - David Koch Theater, North"],
  [40.77197406, -73.98326932, "Escalator - David Koch Theater, North East"],
  [40.77252657, -73.98324251, "Accessible Entrance - David Geffen Theater, South"],
  [40.77241282, -73.98292601, "Escalator - David Geffen Theater, South East"],
  [40.77370062, -73.98245394, "Elevator - Alice Tully Hall, East"],
  [40.77359094, -73.9824754, "Accessible Entrance - Alice Tully Hall, East"],
  [40.77414749, -73.98300111, "Accessible Entrance - The Julliard Store, North"],
  [40.77367625, -73.98352146, "Accessible Entrance - Irene Diamond Building, South"],
  [40.77405812, -73.98442805, "Elevator - Samuel B. and David Rose Building, South"],
  [40.77404593, -73.98435831, "Escalator - Samuel B. and David Rose Building, South"],
  [40.77399312, -73.98432612, "Accessible Entrance - Samuel B. and David Rose Building, South"],
  [40.77371687, -73.98495913, "Accessible Entrance - Lincoln Center Theater, West"],
  [40.773725, -73.98411155, "Accessible Entrance - Lincoln Center Theater, North"],
  [40.77360313, -73.98384869, "Elevator - Lincoln Center Theater, North East"],
  [40.77270532, -73.9857316, "Accessible Entrance - Damrosch Park, West"],
  [40.77125092, -73.98315132, "Accessible Entrance - David Rubenstein Atrium, West"],
  [40.77115342, -73.98281336, "Accessible Entrance (Tickets) - David Rubenstein Atrium"],
  [40.7709056, -73.98240566, "Accessible Entrance - David Rubenstein Atrium, East"],
  [40.77084466, -73.98275971, "Accessible Entrance - David Rubenstein Atrium, South"],
  [40.768728, -73.98239493, "Accessible Entrance - Frederick P. Rose Hall, North East"],
  
];

var myLatLng = {
  lat: 40.7724641,
  lng: -73.9834889
};


// Create the map
var myMapEl = document.getElementById('mymap');

var myMap = new google.maps.Map(myMapEl, {
  center: {lat: 0.7724641, lng: -73.9834889},
  zoom: 14,
  disableDefaultUI: true,
  keyboardShortcuts: true,
  zoomControl: true,
  zoomControlOptions: {
    style: google.maps.ZoomControlStyle.LARGE
  }
});

// search variable to get zoom correctly
var zoomIterations = 0;
var zoomIterationsInterval = null;
var zoomedOut = false;

var mapInitFinished = false;

// flag to focus on first focusable icon in map viewport (after zoom)
var isFocusOnIdle = false;

// add map label
myMap.addListener('idle', function() {

  // A11y Fix
  var iframe = document.getElementsByTagName("IFRAME")[0];
  iframe.setAttribute("aria-hidden", "true");
  //	iframe.setAttribute("title","Google Map");

  // focus on first focusable icon (after zoom)
  if (isFocusOnIdle) {
    setTimeout(function() {
      myMapEl.querySelectorAll('[tabindex="0"]')[1].focus();
    }, 150);
    isFocusOnIdle = false;
  }

  if (mapInitFinished) {
    return;
  }

  myMapEl.querySelectorAll('[tabindex="0"]')[0].setAttribute('aria-label', 'Google Map');

  // init search autocomplete
  var searchInput = document.getElementById('search-input');

  var autocomplete = new google.maps.places.SearchBox(searchInput, {
    types: ['address'],
    // restrict autocomplete to new york area
    bounds: new google.maps.LatLngBounds(
      new google.maps.LatLng({
        lat: 40.5163745,
        lng: -74.3085172
      }), // near perth amboy
      new google.maps.LatLng({
        lat: 41.0081637,
        lng: -73.6849845
      }) // near port chester
    ),
    strictBounds: true
  });

  function autocompleteUpdateAriaStatus() {
    var container = $('.pac-container').last();
    var numResults = container.find('.pac-item').length;

    var message = '';
    if (numResults == 1) {
      message = '1 result is available.';
    } else if (numResults == 0) {
      message = numResults + ' results are available.';
    } else if (container.is(":visible")) {
      message = 'No results are available.';
    } else {
      message = '';
    }

    if (numResults > 0) {
      message += ' Use up and down arrow keys to navigate.';
    }

    $('#autocomplete-status').text(message);
  }

  $(searchInput).on('input', function() {

    markerCluster.sort_point = undefined;

    markerCluster.resetViewport();
    markerCluster.redraw();

    autocompleteUpdateAriaStatus();
  });
  setTimeout(function() {
    $('.pac-container').on('DOMSubtreeModified', autocompleteUpdateAriaStatus);
  }, 1000);


  autocomplete.addListener('places_changed', function() {
    var focused = $(':focus');
    if (!focused || !focused.is('#search-input') && !focused.is('#subm_search')) {
      $('#search-input').focus();
    }
  });

  // autocomplete.addListener('places_changed', function(){
  $('#subm_search').on('click', function() {
    var places = autocomplete.getPlaces();

    if (!places || places.length == 0) {
      markerCluster.sort_point = undefined;

      return;
    }

    var place = places[0];

    if (!place.geometry) {
      alert('Cannot get coordinates: places\'s geometry is empty');
      return;
    }

    var searchPoint = place.geometry.location;

    markerCluster.sort_point = searchPoint;

    // set flag
    // markerCluster.is_search_active = true;

    myMap.panTo(searchPoint);
    myMap.setZoom(16);

    // start calculate correct zoom level for the search
    zoomIterations = 0;
    clearInterval(zoomIterationsInterval);
    zoomedOut = false;
    zoomIterationsInterval = setInterval(function() {
      // stop after number of tries
      if (zoomIterations > 20) {
        clearInterval(zoomIterationsInterval);
        return;
      }
      zoomIterations++;
      console.log(markerCluster.is_paint_finished);
      // zoom out if not enough markers visible
      var countVisible = getClusterMarkersCount(markerCluster);
      if (countVisible == 0 && !markerCluster.is_paint_finished) {
        // do nothing, clusters not ready yet
      } else if (countVisible < 5) {
        zoomedOut = true;
        myMap.setZoom(myMap.getZoom() - 1);
      }
      // zoom in if too much markers visible
      else if (countVisible > 20) {
        // to prevent "jumping" in/out zoom
        if (!zoomedOut) {
          myMap.setZoom(myMap.getZoom() + 1);
        }
      }

    }, 50);
  });

  // add event listener for input
  $(searchInput).on('keyup', function(e) {
    // enter pressed
    if (e.which == 13) {
      $('#subm_search').click();
    }
  });

  mapInitFinished = true;
});

function getClusterMarkersCount(markerCluster) {
  if (!markerCluster || !markerCluster.clusters_ || !markerCluster.clusters_.length) {
    return 0;
  }

  var count = 0;

  for (var i = 0; i < markerCluster.clusters_.length; i++) {
    count += markerCluster.clusters_[i].markers_.length;
  }

  return count;
}

// move focus to first available cluster after clicked on cluster
myMap.addListener('clusterclick', function() {
  // wait for idle, then focus on first focusable icon
  isFocusOnIdle = true;
});
var myBounds = new google.maps.LatLngBounds();
// check space/enter pressed on cluster icon
myMap.getDiv().addEventListener('keyup', function(e) {
  if (e.which == 32 || e.which == 13) {
    if ($(e.target).hasClass('ee_cluster_icon')) {
      e.preventDefault();
      e.stopPropagation();
      e.target.click();
    }
  }
});


var gMarkers = myMarkers.map(function(el, i) {
  var marker = new google.maps.Marker({
    position: {
      lat: el[0],
      lng: el[1]
    },
    map: myMap,
    title: el[2]
  });

  myBounds.extend(marker.getPosition());

  marker.id = i;

  var infoMatches = el[2].match(/(.*) - (.*?)$/);

  if (infoMatches) {
    marker.address = infoMatches[1];
    marker.date = infoMatches[2];

    // get info about neighbourhood
    $.get('https://maps.googleapis.com/maps/api/geocode/json?address=' + marker.address + '&key=' + apiKey, function(data) {
      this.geocode_data = data;
    }.bind(marker));
  }

  // marker.infoWindow = new google.maps.InfoWindow({
  // 	content: '<div tabindex="0">' + el[2] + '</div>'
  // });

  return marker;
});

myMap.fitBounds(myBounds);

var markerCluster = new MarkerClusterer(myMap, gMarkers, {
  imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
  minimumClusterSize: 1
});

myMap.addListener('center_changed', timeoutTableUpdate);
myMap.addListener('zoom_changed', timeoutTableUpdate);

var panorama = new google.maps.StreetViewPanorama(
  document.getElementById('pano'), {
    position: myMap.getCenter(),
    pov: {
      heading: 256,
      pitch: 0
    },
    addressControlOptions: {
      position: google.maps.ControlPosition.BOTTOM_CENTER
    },
    clickToGo: false,
    linksControl: false,
    panControl: false,
    enableCloseButton: false
  }
);
// hiden by default
panorama.setVisible(false);

function updateTableView() {
  var tableView = $('#table_view');
  var tbody = tableView.find('tbody');

  var distanceCol = $('#table_view_distance_col');

  var html = '';
  // get visible clusters
  var clusters = markerCluster.clusters_;

  var sortPoint = markerCluster.sort_point;

  // is there's sort point, show distance to it
  if (sortPoint) {
    distanceCol.removeAttr('hidden');
  } else {
    distanceCol.attr('hidden', true);
  }

  var n = 1;

  for (var i = 0; i < clusters.length; i++) {
    for (var j = 0; j < clusters[i].markers_.length; j++) {
      var marker = clusters[i].markers_[j];
      html += '<tr>' +
        // '<td>'+n+'</td>' +
        '<th scope="row">' + marker.address + '</th>' +
        '<td ' + (sortPoint ? '' : 'hidden') + '>' + (sortPoint ? formatDistance(marker.distance_to_sort_point) : '') + '</td>' +
        '<td>' + marker.date + '</td>' +
        '</tr>';

      n++;
    }
  }

  tbody.html(html);
}

function timeoutTableUpdate() {
  // update table view
  setTimeout(updateTableView, 1000);

  // clear search field as search results now don't displayed for that query, but for manual selected region now
  var sortPoint = markerCluster.sort_point;
  if (!sortPoint) {
    $('#search-input').val('');
  }
}

function toggleStreetView() {
  var panoEl = document.getElementById('pano');
  var mapEl = document.getElementById('mymap');

  var toggle = panorama.getVisible();
  if (toggle == false) {
    panoEl.hidden = false;
    mapEl.classList.add('with_pano');
    panorama.setVisible(true);
  } else {
    panoEl.hidden = true;
    mapEl.classList.remove('with_pano');
    panorama.setVisible(false);
  }
}

$('#toggle_table_view').on('click', function() {
  var tableView = $('#table_view');
  var myMapWrap = $('#my_map_wrap');
  var search = $('#search');
  var streetViewSwitcher = $('#floating-panel');
  if (this.checked) {
    myMapWrap.addClass('hide');
    tableView.removeAttr('hidden');
    search.addClass('inline');
    updateTableView();

    streetViewSwitcher.attr('hidden', 'hidden');
  } else {
    myMapWrap.removeClass('hide');
    tableView.attr('hidden', 'hidden');
    search.removeClass('inline');

    streetViewSwitcher.removeAttr('hidden');
  }
});

function formatDistance(kmVal) {
  var milesVal = getMilesFromKm(kmVal).toFixed(2);
  return milesVal;
}

function getMilesFromKm(i) {
  return i * 0.621371192;
}

function getKmFromMiles(i) {
  return i * 1.609344;
}

$("body").keyup(function(e) {

  if (e.altKey) {
    $("label").removeClass("accessKeyHighlight");
    altPressed = false;
  }
});

$("body").keydown(function(e) {


  if (e.altKey) {
    $("label").addClass("accessKeyHighlight");
    altPressed = true;
  }
});

