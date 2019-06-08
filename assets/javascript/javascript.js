$(document).ready(function() {

    // create a sweet bicycle icon 
    var bikeIcon = L.divIcon({
        html: "<i class=\"fas fa-bicycle\"></i>",
        iconSize: [16, 16]
    });

    var styleMarker = function(station) { // returns a color value, need to apply this to the inline styling of each icon at layer.options.icon.html
        var currLayer = station;
        console.log(currLayer);
        currLayer.ratio = currLayer.free_bikes / (currLayer.empty_slots + currLayer.free_bikes);
        return currLayer.ratio > 0.4 ? "#40ff00":
                     currLayer.ratio > 0.1 ? "#ffbf00":
                                              "#ff0000";
    }

    function makeBikeIcon(station) {
        var color = styleMarker(station);
        var locationIcon = L.divIcon({
            html: `<i class='fas fa-bicycle' style='color: ${color}'></i>`,
            iconSize: [16, 16]
        });
        return locationIcon;
    }

    var locationIcon = L.divIcon({
        html: "<i class=\"fas fa-walking\"></i>",
        iconSize: [16, 16]
    });

    var marker = L.circleMarker();

    var makePopup = function(layer) {
        var infoDiv = document.createElement("div");
        var bikes = document.createElement("h2");
        bikes.textContent = `Available Bikes: ${layer.options.bikes}`;
        var slots = document.createElement("h2");
        slots.textContent = `Available Slots: ${layer.options.slots}`;
        infoDiv.appendChild(bikes);
        infoDiv.appendChild(slots);
        var popup = L.popup();
        popup.setContent(infoDiv);
        layer.bindPopup(popup);
    }
   
    // initialize a map of the world in the background
    var map = L.map('map', {
        center: [39.8283, -98.5795],
        zoom: 3
    });

    var street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
    }).addTo(map);

    // create layer control
    var baseLayers = {
        "street": street
    }

    var layerControl = new L.control.layers(baseLayers).addTo(map);

    // pull markers in from the bikeshare api to look into the map
    var url = "https://api.citybik.es/v2/networks/";
    var getAllBikeShare = async function() {
        var response = await $.ajax({
            method: "GET",
            url: url,
        });
        var networks = [];
        response.networks.forEach(element => { // array of bikeshare network objects with relavant info
            networks.push(
                L.marker([element.location.latitude, element.location.longitude], {icon: bikeIcon, title: element.name, id: element.id})
            );
        });
        return networks;
    };

    var bikeNetworks;
    var networkArray;
    getAllBikeShare().then(function(networks) {
        networkArray = networks;
        bikeNetworks = L.layerGroup(networks).addTo(map); // add all points to the map
        layerControl.addOverlay(bikeNetworks, "Bike Shares"); // add the resulting layer to the map
    });

    var findClosestShare = function (event, shares) {
        var sharesWithDistance = shares;
        var distArray = [];
        if (event.accuracy < 100) {
            sharesWithDistance.forEach(element => {
                element.distance = map.distance(event.latlng, element._latlng);
                distArray.push(element.distance);
            });
            var minDist = Math.min.apply(null, distArray);
            var index = distArray.indexOf(minDist);
            console.log(sharesWithDistance[index]);
            return sharesWithDistance[index];
        }
    }

    var getBikes = async function(path) {
        var response = await $.ajax({
            method: "GET",
            url: `${url}${path}`
        });
        // console.log(response);
        var stations = response.network.stations;
        var stationMarkers = [];
        stations.forEach(element => {
            console.log(element);
            stationMarkers.push(
                L.marker([element.latitude, element.longitude], {
                    bikes: element.free_bikes,
                    slots: element.empty_slots
                }).setIcon(makeBikeIcon(element))
            );
        })
        return stationMarkers;
    }

    // ============= event handlers ====================

    // the closest share to you
    var closestShare;
    var closestShareBikes = [];
    
    

    // event handler for get location || search location
    $("#find-location").on("click", function (event) {
        event.preventDefault();
        // hide the modal
        $("#start-modal").fadeOut(500);
        var findMe = map.locate({
            watch: true
        });
        
    });

     // watching for a location event
     map.on("locationfound", async function(event) {
        // add a small marker to the location and fly to it on the map
        marker.setLatLng(event.latlng).addTo(map);
        // get the share that is closest
        if (!closestShare) {
            map.flyTo(event.latlng, 12); // flies here once 
            closestShare = findClosestShare(event, networkArray); // set the closest share to location
            closestShareBikes = await getBikes(closestShare.options.id);
            // clear the existing markers from the map
            bikeNetworks.removeFrom(map);
            layerControl.removeLayer(bikeNetworks);
            // populate the map with all the sites
            var stations = L.layerGroup(closestShareBikes).addTo(map);
            layerControl.addOverlay(stations, "Stations");
            stations.eachLayer(function(layer) {
                // bind a popup with station bike availability information
                makePopup(layer);
            });
        }
    });



});