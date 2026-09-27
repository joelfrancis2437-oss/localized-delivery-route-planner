from flask import Flask, render_template, request, jsonify
import requests
import sqlite3
import math

app = Flask(__name__)

# ==================================================
# NOMINATIM USER-AGENT
# ==================================================

HEADERS = {
    "User-Agent": "LocalizedDeliveryRoutePlanner/1.0"
}


# ==================================================
# DATABASE INITIALIZATION
# ==================================================

def init_database():

    connection = sqlite3.connect("database.db")
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS route_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pickup_location TEXT NOT NULL,
            delivery_address TEXT NOT NULL,
            priority TEXT DEFAULT 'Normal',
            status TEXT DEFAULT 'Pending',
            distance REAL,
            duration INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    connection.commit()
    connection.close()

    print("Database initialized successfully.")


# ==================================================
# SAVE ROUTE TO DATABASE
# ==================================================

def save_route_to_database(
    pickup,
    deliveries,
    distance,
    duration
):

    connection = sqlite3.connect("database.db")
    cursor = connection.cursor()

    for delivery in deliveries:

        cursor.execute("""
            INSERT INTO route_history (
                pickup_location,
                delivery_address,
                priority,
                status,
                distance,
                duration
            )
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            pickup,
            delivery.get("address", ""),
            delivery.get("priority", "Normal"),
            delivery.get("status", "Pending"),
            distance,
            duration
        ))

    connection.commit()
    connection.close()

    print("Route data saved successfully.")


# ==================================================
# GET COORDINATES
# ==================================================

def get_coordinates(place):

    url = "https://nominatim.openstreetmap.org/search"

    params = {
        "q": place + ", Chennai, India",
        "format": "json",
        "limit": 1,
        "countrycodes": "in"
    }

    try:

        response = requests.get(
            url,
            params=params,
            headers=HEADERS,
            timeout=20
        )

        response.raise_for_status()

        data = response.json()

        if not data:
            return None

        return [
            float(data[0]["lon"]),
            float(data[0]["lat"])
        ]

    except requests.exceptions.RequestException as error:

        print("Nominatim Error:", error)

        return None


# ==================================================
# CALCULATE DISTANCE
# ==================================================

def calculate_distance(point1, point2):

    lon1, lat1 = point1
    lon2, lat2 = point2

    radius = 6371

    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)

    difference_lat = math.radians(
        lat2 - lat1
    )

    difference_lon = math.radians(
        lon2 - lon1
    )

    a = (
        math.sin(difference_lat / 2) ** 2
        +
        math.cos(lat1)
        * math.cos(lat2)
        * math.sin(difference_lon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return radius * c


# ==================================================
# PRIORITY BASED ROUTE OPTIMIZATION
# ==================================================

def optimize_route(
    coordinates,
    deliveries
):

    if len(coordinates) <= 2:
        return list(range(len(coordinates)))

    remaining = list(
        range(1, len(coordinates))
    )

    optimized_order = [0]

    current = 0

    priority_weight = {
        "High": 3,
        "Normal": 2,
        "Low": 1
    }

    while remaining:

        def route_score(stop):

            delivery_index = stop - 1

            priority = "Normal"

            if delivery_index < len(deliveries):

                priority = deliveries[
                    delivery_index
                ].get(
                    "priority",
                    "Normal"
                )

            weight = priority_weight.get(
                priority,
                2
            )

            distance = calculate_distance(
                coordinates[current],
                coordinates[stop]
            )

            return distance / weight

        next_stop = min(
            remaining,
            key=route_score
        )

        optimized_order.append(
            next_stop
        )

        remaining.remove(
            next_stop
        )

        current = next_stop

    return optimized_order


# ==================================================
# HOME
# ==================================================

@app.route("/")
def home():

    return render_template(
        "index.html"
    )


# ==================================================
# PLANNER
# ==================================================

@app.route("/planner")
def planner():

    return render_template(
        "planner.html"
    )


# ==================================================
# ABOUT
# ==================================================

@app.route("/about")
def about():

    return render_template(
        "about.html"
    )


# ==================================================
# CONTACT
# ==================================================

@app.route("/contact")
def contact():

    return render_template(
        "contact.html"
    )


# ==================================================
# PLAN ROUTE
# ==================================================

@app.route(
    "/plan",
    methods=["POST"]
)
def plan():

    try:

        data = request.get_json()

        if not data:

            return jsonify({
                "success": False,
                "message": "No data received."
            })

        locations = data.get(
            "locations",
            []
        )

        locations = [
            location.strip()
            for location in locations
            if isinstance(location, str)
            and location.strip()
        ]

        deliveries = data.get(
            "deliveries",
            []
        )

        valid_deliveries = []

        allowed_priorities = [
            "High",
            "Normal",
            "Low"
        ]

        allowed_statuses = [
            "Pending",
            "Out for Delivery",
            "Delivered",
            "Cancelled"
        ]

        for delivery in deliveries:

            if not isinstance(delivery, dict):
                continue

            address = delivery.get(
                "address",
                ""
            )

            if not isinstance(address, str):
                continue

            address = address.strip()

            if address:

                priority = delivery.get(
                    "priority",
                    "Normal"
                )

                status = delivery.get(
                    "status",
                    "Pending"
                )

                if priority not in allowed_priorities:
                    priority = "Normal"

                if status not in allowed_statuses:
                    status = "Pending"

                valid_deliveries.append({
                    "address": address,
                    "priority": priority,
                    "status": status
                })

        if len(locations) < 2:

            return jsonify({
                "success": False,
                "message":
                "Please enter pickup and at least one delivery."
            })

        coordinates = []

        for location in locations:

            print(
                "Finding location:",
                location
            )

            coord = get_coordinates(
                location
            )

            if coord is None:

                return jsonify({
                    "success": False,
                    "message":
                    "Could not find location: "
                    + location
                })

            coordinates.append(coord)

        print(
            "Original Coordinates:",
            coordinates
        )

        optimized_order = optimize_route(
            coordinates,
            valid_deliveries
        )

        print(
            "Optimized Order:",
            optimized_order
        )

        optimized_locations = [
            locations[index]
            for index in optimized_order
        ]

        optimized_coordinates = [
            coordinates[index]
            for index in optimized_order
        ]

        optimized_deliveries = []

        for index in optimized_order[1:]:

            delivery_index = index - 1

            if delivery_index < len(
                valid_deliveries
            ):

                optimized_deliveries.append(
                    valid_deliveries[
                        delivery_index
                    ]
                )

        coordinate_string = ";".join(
            f"{lon},{lat}"
            for lon, lat
            in optimized_coordinates
        )

        osrm_url = (
            "https://router.project-osrm.org/"
            "route/v1/driving/"
            + coordinate_string
        )

        params = {
            "overview": "full",
            "geometries": "geojson"
        }

        response = requests.get(
            osrm_url,
            params=params,
            timeout=30
        )

        response.raise_for_status()

        route_data = response.json()

        print(
            "OSRM Response:",
            route_data.get("code")
        )

        if route_data.get("code") != "Ok":

            return jsonify({
                "success": False,
                "message":
                "Route calculation failed."
            })

        route = route_data["routes"][0]

        distance_km = round(
            route["distance"] / 1000,
            2
        )

        duration_minutes = round(
            route["duration"] / 60
        )

        geometry = route["geometry"]

        save_route_to_database(
            pickup=optimized_locations[0],
            deliveries=optimized_deliveries,
            distance=distance_km,
            duration=duration_minutes
        )

        return jsonify({
            "success": True,
            "distance": distance_km,
            "duration": duration_minutes,
            "locations": optimized_locations,
            "deliveries": optimized_deliveries,
            "geometry": geometry,
            "stop_coordinates": optimized_coordinates,
            "optimized": True
        })

    except Exception as error:

        print(
            "ERROR:",
            error
        )

        return jsonify({
            "success": False,
            "message":
            "Something went wrong: "
            + str(error)
        })


# ==================================================
# ROUTE HISTORY
# ==================================================

@app.route("/history")
def history():

    connection = sqlite3.connect(
        "database.db"
    )

    connection.row_factory = sqlite3.Row

    cursor = connection.cursor()

    cursor.execute("""
        SELECT *
        FROM route_history
        ORDER BY id DESC
    """)

    routes = cursor.fetchall()

    connection.close()

    return render_template(
        "history.html",
        routes=routes
    )


# ==================================================
# UPDATE DELIVERY STATUS
# ==================================================

@app.route(
    "/update-status/<int:route_id>",
    methods=["POST"]
)
def update_status(route_id):

    try:

        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "message": "No data received."
            })

        new_status = data.get(
            "status",
            ""
        )

        allowed_statuses = [
            "Pending",
            "Out for Delivery",
            "Delivered",
            "Cancelled"
        ]

        if new_status not in allowed_statuses:

            return jsonify({
                "success": False,
                "message": "Invalid status."
            })

        connection = sqlite3.connect(
            "database.db"
        )

        cursor = connection.cursor()

        cursor.execute("""
            UPDATE route_history
            SET status = ?
            WHERE id = ?
        """, (
            new_status,
            route_id
        ))

        connection.commit()

        updated_rows = cursor.rowcount

        connection.close()

        if updated_rows == 0:

            return jsonify({
                "success": False,
                "message":
                "Route record not found."
            })

        return jsonify({
            "success": True,
            "message":
            "Status updated successfully."
        })

    except Exception as error:

        print(
            "Status Update Error:",
            error
        )

        return jsonify({
            "success": False,
            "message": str(error)
        })


# ==================================================
# DASHBOARD
# ==================================================

@app.route("/dashboard")
def dashboard():

    connection = sqlite3.connect(
        "database.db"
    )

    cursor = connection.cursor()

    cursor.execute("""
        SELECT COUNT(*)
        FROM route_history
    """)

    total_deliveries = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM route_history
        WHERE status = 'Pending'
    """)

    pending = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM route_history
        WHERE status = 'Out for Delivery'
    """)

    out_for_delivery = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM route_history
        WHERE status = 'Delivered'
    """)

    delivered = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM route_history
        WHERE status = 'Cancelled'
    """)

    cancelled = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COALESCE(SUM(distance), 0)
        FROM route_history
    """)

    total_distance = cursor.fetchone()[0]

    connection.close()

    # ----------------------------------------------
    # CALCULATE PERCENTAGES
    # ----------------------------------------------

    if total_deliveries > 0:

        pending_percent = round(
            (pending / total_deliveries) * 100
        )

        out_for_delivery_percent = round(
            (out_for_delivery / total_deliveries) * 100
        )

        delivered_percent = round(
            (delivered / total_deliveries) * 100
        )

        cancelled_percent = round(
            (cancelled / total_deliveries) * 100
        )

    else:

        pending_percent = 0
        out_for_delivery_percent = 0
        delivered_percent = 0
        cancelled_percent = 0

    return render_template(
        "dashboard.html",

        total_deliveries=
        total_deliveries,

        pending=
        pending,

        out_for_delivery=
        out_for_delivery,

        delivered=
        delivered,

        cancelled=
        cancelled,

        total_distance=
        round(
            total_distance,
            2
        ),

        pending_percent=
        pending_percent,

        out_for_delivery_percent=
        out_for_delivery_percent,

        delivered_percent=
        delivered_percent,

        cancelled_percent=
        cancelled_percent
    )


# ==================================================
# INITIALIZE DATABASE
# ==================================================
#
# IMPORTANT:
# This runs when Flask/Gunicorn imports this file.
# Therefore database table is also created during
# online deployment.
#

init_database()


# ==================================================
# RUN APPLICATION
# ==================================================

if __name__ == "__main__":

    app.run(
        debug=True
    )