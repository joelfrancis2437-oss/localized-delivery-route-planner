/* =========================================================
   LOCALIZED DELIVERY ROUTE PLANNER
   Main JavaScript
   ========================================================= */

let routeMap = null;
let routeLayer = null;


/* =========================================================
   FIND ROUTE
   ========================================================= */

async function findRoute() {

    console.log("STEP 1: Find Route Started");

    const routeButton = document.getElementById("routeButton");
    const resultBox = document.getElementById("result");

    if (!routeButton) {
        console.error("Route button not found.");
        return;
    }

    if (!resultBox) {
        console.error("Result box not found.");
        return;
    }

    routeButton.disabled = true;
    routeButton.innerText = "Finding Best Route...";

    resultBox.innerHTML = `
        <div class="route-result-card">
            <p>Finding locations and calculating the best route...</p>
        </div>
    `;

    try {

        /* -------------------------------------------------
           PICKUP
           ------------------------------------------------- */

        const pickupInput = document.getElementById("pickup");

        if (!pickupInput) {
            throw new Error("Pickup input not found.");
        }

        const pickup = pickupInput.value.trim();

        if (!pickup) {
            throw new Error("Please enter pickup location.");
        }


        /* -------------------------------------------------
           DELIVERY LOCATIONS
           ------------------------------------------------- */

        const locations = [pickup];
        const deliveries = [];


        for (let i = 1; i <= 5; i++) {

            const addressInput =
                document.getElementById(`address${i}`);

            const priorityInput =
                document.getElementById(`priority${i}`);

            const statusInput =
                document.getElementById(`status${i}`);


            if (!addressInput) {
                continue;
            }


            const address = addressInput.value.trim();


            if (!address) {
                continue;
            }


            const priority =
                priorityInput
                    ? priorityInput.value
                    : "Normal";


            const status =
                statusInput
                    ? statusInput.value
                    : "Pending";


            locations.push(address);


            deliveries.push({
                address: address,
                priority: priority,
                status: status
            });
        }


        /* -------------------------------------------------
           VALIDATION
           ------------------------------------------------- */

        if (locations.length < 2) {

            throw new Error(
                "Please enter at least one delivery address."
            );
        }


        console.log("Locations:", locations);
        console.log("Deliveries:", deliveries);


        /* -------------------------------------------------
           SEND DATA TO FLASK
           ------------------------------------------------- */

        const response = await fetch("/plan", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                locations: locations,
                deliveries: deliveries
            })
        });


        console.log("HTTP Status:", response.status);


        const data = await response.json();


        console.log("Server Response:", data);


        /* -------------------------------------------------
           SERVER ERROR
           ------------------------------------------------- */

        if (!response.ok || data.error) {

            throw new Error(
                data.error || "Route calculation failed."
            );
        }


        /* -------------------------------------------------
           DISPLAY RESULT
           ------------------------------------------------- */

        displayRouteResult(data);


    } catch (error) {

        console.error("Route Error:", error);

        resultBox.innerHTML = `
            <div class="route-result-card">
                <div class="route-error">
                    <strong>Route Calculation Failed</strong>
                    <br><br>
                    ${escapeHtml(error.message)}
                </div>
            </div>
        `;

    } finally {

        routeButton.disabled = false;
        routeButton.innerText = "Find Best Route 🚚";
    }
}


/* =========================================================
   DISPLAY ROUTE RESULT
   ========================================================= */

function displayRouteResult(data) {

    const resultBox = document.getElementById("result");

    if (!resultBox) {
        return;
    }


    const distance =
        data.distance !== undefined
            ? data.distance
            : 0;


    const duration =
        data.duration !== undefined
            ? data.duration
            : 0;


    const locations =
        Array.isArray(data.locations)
            ? data.locations
            : [];


    const deliveries =
        Array.isArray(data.deliveries)
            ? data.deliveries
            : [];


    resultBox.innerHTML = `

        <div class="route-result-card">

            <h2>🚚 Route Calculation Result</h2>

            <div class="route-success">
                ✓ Route calculated successfully
            </div>


            <div class="route-summary">

                <div class="summary-box">

                    <div class="summary-title">
                        Total Distance
                    </div>

                    <div class="summary-value">
                        ${escapeHtml(String(distance))} km
                    </div>

                </div>


                <div class="summary-box">

                    <div class="summary-title">
                        Estimated Duration
                    </div>

                    <div class="summary-value">
                        ${escapeHtml(String(duration))} min
                    </div>

                </div>

            </div>


            <h3>📍 Optimized Route</h3>

            <div id="routeList" class="route-list"></div>


            <div class="map-wrapper">

                <div id="map"></div>

            </div>

        </div>
    `;


    /* -------------------------------------------------
       ROUTE LIST
       ------------------------------------------------- */

    createRouteList(locations, deliveries);


    /* -------------------------------------------------
       CREATE MAP
       ------------------------------------------------- */

    setTimeout(() => {

        createRouteMap(data);

    }, 100);


    /*
       Leaflet sometimes calculates the container size
       before the browser finishes rendering it.
       Multiple invalidateSize calls prevent the
       split/duplicated map problem.
    */

    setTimeout(() => {

        refreshMapSize();

    }, 300);


    setTimeout(() => {

        refreshMapSize();

    }, 700);


    setTimeout(() => {

        refreshMapSize();

    }, 1200);
}


/* =========================================================
   CREATE ROUTE LIST
   ========================================================= */

function createRouteList(locations, deliveries) {

    const routeList =
        document.getElementById("routeList");


    if (!routeList) {
        return;
    }


    if (!locations.length) {

        routeList.innerHTML =
            "<p>No route stops available.</p>";

        return;
    }


    let html = "";


    locations.forEach((location, index) => {

        if (index === 0) {

            html += `

                <div class="route-stop">

                    <div
                        class="stop-number"
                        style="background:#16a34a;"
                    >
                        P
                    </div>

                    <div class="stop-details">

                        <div class="stop-address">
                            ${escapeHtml(location)}
                        </div>

                        <div class="stop-meta">
                            Pickup Location
                        </div>

                    </div>

                </div>
            `;

        } else {

            const delivery =
                deliveries[index - 1] || {};


            const priority =
                delivery.priority || "Normal";


            const status =
                delivery.status || "Pending";


            const priorityClass =
                getPriorityClass(priority);


            const statusClass =
                getStatusClass(status);


            html += `

                <div class="route-stop">

                    <div class="stop-number">
                        ${index}
                    </div>

                    <div class="stop-details">

                        <div class="stop-address">
                            ${escapeHtml(location)}
                        </div>

                        <div class="stop-meta">

                            <span
                                class="priority-badge ${priorityClass}"
                            >
                                ${escapeHtml(priority)}
                            </span>

                            &nbsp;

                            <span
                                class="status-badge ${statusClass}"
                            >
                                ${escapeHtml(status)}
                            </span>

                        </div>

                    </div>

                </div>
            `;
        }

    });


    routeList.innerHTML = html;
}


/* =========================================================
   CREATE LEAFLET MAP
   ========================================================= */

function createRouteMap(data) {

    const mapElement =
        document.getElementById("map");


    if (!mapElement) {

        console.error("Map element not found.");

        return;
    }


    if (typeof L === "undefined") {

        console.error(
            "Leaflet library is not loaded."
        );

        mapElement.innerHTML = `
            <div style="
                padding:20px;
                text-align:center;
                color:#b91c1c;
            ">
                Map library could not be loaded.
                Please check your internet connection.
            </div>
        `;

        return;
    }


    /* -------------------------------------------------
       REMOVE OLD MAP
       ------------------------------------------------- */

    if (routeMap) {

        try {
            routeMap.remove();
        } catch (error) {
            console.log("Old map cleanup:", error);
        }

        routeMap = null;
    }


    /* -------------------------------------------------
       CREATE MAP
       ------------------------------------------------- */

    routeMap = L.map("map", {

        zoomControl: true,

        attributionControl: true,

        preferCanvas: false
    });


    /* -------------------------------------------------
       OPENSTREETMAP TILES
       ------------------------------------------------- */

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,

            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',

            detectRetina: true
        }
    ).addTo(routeMap);


    /* -------------------------------------------------
       ROUTE COORDINATES
       ------------------------------------------------- */

    const coordinates =
        Array.isArray(data.stop_coordinates)
            ? data.stop_coordinates
            : [];


    const locations =
        Array.isArray(data.locations)
            ? data.locations
            : [];


    const deliveries =
        Array.isArray(data.deliveries)
            ? data.deliveries
            : [];


    /* -------------------------------------------------
       ADD MARKERS
       ------------------------------------------------- */

    const markerGroup = [];


    coordinates.forEach((coordinate, index) => {

        if (
            !Array.isArray(coordinate) ||
            coordinate.length < 2
        ) {
            return;
        }


        const lon = Number(coordinate[0]);
        const lat = Number(coordinate[1]);


        if (
            Number.isNaN(lon) ||
            Number.isNaN(lat)
        ) {
            return;
        }


        /* ---------------------------------------------
           PICKUP MARKER
           --------------------------------------------- */

        if (index === 0) {

            const pickupIcon =
                L.divIcon({

                    className: "",

                    html: `
                        <div style="
                            width:32px;
                            height:32px;
                            border-radius:50%;
                            background:#16a34a;
                            color:white;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            font-weight:bold;
                            border:3px solid white;
                            box-shadow:0 2px 8px rgba(0,0,0,.35);
                        ">
                            P
                        </div>
                    `,

                    iconSize: [32, 32],

                    iconAnchor: [16, 16],

                    popupAnchor: [0, -16]
                });


            const marker =
                L.marker(
                    [lat, lon],
                    { icon: pickupIcon }
                ).addTo(routeMap);


            marker.bindPopup(`

                <strong>📦 Pickup</strong>
                <br>
                ${escapeHtml(locations[index] || "Pickup")}

            `);


            markerGroup.push(marker);

            return;
        }


        /* ---------------------------------------------
           DELIVERY MARKER
           --------------------------------------------- */

        const delivery =
            deliveries[index - 1] || {};


        const priority =
            delivery.priority || "Normal";


        const status =
            delivery.status || "Pending";


        const markerColor =
            getPriorityColor(priority);


        const deliveryIcon =
            L.divIcon({

                className: "",

                html: `
                    <div style="
                        width:34px;
                        height:34px;
                        border-radius:50%;
                        background:${markerColor};
                        color:white;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        font-weight:bold;
                        border:3px solid white;
                        box-shadow:0 2px 8px rgba(0,0,0,.35);
                    ">
                        ${index}
                    </div>
                `,

                iconSize: [34, 34],

                iconAnchor: [17, 17],

                popupAnchor: [0, -17]
            });


        const marker =
            L.marker(
                [lat, lon],
                { icon: deliveryIcon }
            ).addTo(routeMap);


        marker.bindPopup(`

            <strong>📍 Delivery ${index}</strong>

            <br><br>

            <strong>Address:</strong>
            <br>
            ${escapeHtml(
                locations[index] ||
                delivery.address ||
                "Delivery"
            )}

            <br><br>

            <strong>Priority:</strong>
            ${escapeHtml(priority)}

            <br>

            <strong>Status:</strong>
            ${escapeHtml(status)}

        `);


        markerGroup.push(marker);
    });


    /* -------------------------------------------------
       DRAW OSRM ROUTE
       ------------------------------------------------- */

    if (
        data.geometry &&
        data.geometry.coordinates &&
        data.geometry.coordinates.length
    ) {

        const routeCoordinates =
            data.geometry.coordinates.map(
                coordinate => [
                    Number(coordinate[1]),
                    Number(coordinate[0])
                ]
            );


        routeLayer =
            L.polyline(
                routeCoordinates,
                {
                    color: "#2563eb",

                    weight: 6,

                    opacity: 0.85,

                    lineJoin: "round",

                    lineCap: "round"
                }
            ).addTo(routeMap);


        routeMap.fitBounds(
            routeLayer.getBounds(),
            {
                padding: [35, 35]
            }
        );

    } else if (markerGroup.length) {

        const bounds =
            L.featureGroup(markerGroup)
                .getBounds();


        routeMap.fitBounds(
            bounds,
            {
                padding: [35, 35]
            }
        );

    } else {

        routeMap.setView(
            [13.0827, 80.2707],
            11
        );
    }


    /* -------------------------------------------------
       LEGEND
       ------------------------------------------------- */

    addMapLegend();


    /* -------------------------------------------------
       IMPORTANT MAP SIZE FIX
       ------------------------------------------------- */

    setTimeout(() => {

        if (routeMap) {
            routeMap.invalidateSize(true);
        }

    }, 200);
}


/* =========================================================
   MAP LEGEND
   ========================================================= */

function addMapLegend() {

    if (!routeMap) {
        return;
    }


    const legend =
        L.control({
            position: "bottomright"
        });


    legend.onAdd = function () {

        const div =
            L.DomUtil.create(
                "div",
                "map-legend"
            );


        div.innerHTML = `

            <div class="legend-title">
                Route Priority
            </div>

            <div class="legend-item">
                <span
                    class="legend-color"
                    style="background:#dc2626;"
                ></span>
                High
            </div>

            <div class="legend-item">
                <span
                    class="legend-color"
                    style="background:#f97316;"
                ></span>
                Normal
            </div>

            <div class="legend-item">
                <span
                    class="legend-color"
                    style="background:#2563eb;"
                ></span>
                Low
            </div>

            <div class="legend-item">
                <span
                    class="legend-color"
                    style="background:#16a34a;"
                ></span>
                Pickup
            </div>
        `;


        return div;
    };


    legend.addTo(routeMap);
}


/* =========================================================
   REFRESH MAP SIZE
   ========================================================= */

function refreshMapSize() {

    if (!routeMap) {
        return;
    }


    try {

        routeMap.invalidateSize(true);

    } catch (error) {

        console.log(
            "Map resize:",
            error
        );
    }
}


/* =========================================================
   WINDOW RESIZE
   ========================================================= */

window.addEventListener(
    "resize",
    function () {

        setTimeout(() => {

            refreshMapSize();

        }, 200);
    }
);


/* =========================================================
   PRIORITY COLOR
   ========================================================= */

function getPriorityColor(priority) {

    switch (String(priority).toLowerCase()) {

        case "high":
            return "#dc2626";

        case "low":
            return "#2563eb";

        case "normal":
        default:
            return "#f97316";
    }
}


/* =========================================================
   PRIORITY CSS CLASS
   ========================================================= */

function getPriorityClass(priority) {

    switch (String(priority).toLowerCase()) {

        case "high":
            return "priority-high";

        case "low":
            return "priority-low";

        case "normal":
        default:
            return "priority-normal";
    }
}


/* =========================================================
   STATUS CSS CLASS
   ========================================================= */

function getStatusClass(status) {

    switch (String(status).toLowerCase()) {

        case "delivered":
            return "status-delivered";

        case "out for delivery":
            return "status-out";

        case "cancelled":
            return "status-cancelled";

        case "pending":
        default:
            return "status-pending";
    }
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   INITIAL MESSAGE
   ========================================================= */

console.log(
    "Localized Delivery Route Planner JavaScript loaded successfully."
);