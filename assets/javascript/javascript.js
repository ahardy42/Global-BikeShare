$(document).ready(function() {

    // create a sweet bicycle icon 
    var bikeIcon = L.divIcon({
        html: "<i class=\"fas fa-bicycle\"></i>",
        iconSize: [16, 16]
    });

    var locationIcon = L.divIcon({
        html: "<i class=\"fas fa-walking\"></i>",
        iconSize: [16, 16]
    })
   
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

    // ============= event handlers ====================

    // the closest share to you
    var closestShare;

    // event handler for get location || search location
    $("#find-location").on("click", function (event) {
        event.preventDefault();
        // hide the modal
        $("#start-modal").fadeOut(500);
        map.locate({
            watch: true,
            setView: true,
            maxZoom: 12
        });
    });

     // watching for a location event
     map.on("locationfound", function(event) {
        // add a small marker to the location
        // L.marker(event.latlng, {icon: locationIcon}).addTo(map);
        L.circleMarker(event.latlng).addTo(map);
        // get the share that is closest
        if (!closestShare) {
            closestShare = findClosestShare(event, networkArray); // set the closest share to location
            
        }
    });



});