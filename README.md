# Localized Delivery Route Planner

## Project Overview

Localized Delivery Route Planner is a web-based application designed to help local delivery drivers plan and manage delivery routes efficiently.

The system accepts a pickup location and multiple delivery addresses, calculates an optimized delivery sequence, displays the route on an interactive map, and stores delivery information for future tracking.

## Objectives

- Plan delivery routes efficiently.
- Reduce unnecessary travel distance.
- Prioritize important deliveries.
- Display routes on an interactive map.
- Store delivery history.
- Track delivery status.
- Provide delivery statistics through a dashboard.

## Main Features

- Pickup and delivery location input
- Multiple delivery addresses
- Priority-based route optimization
- Interactive route map
- Distance and duration calculation
- Delivery status management
- Route history
- Search and filter options
- Delivery dashboard
- Delivery analytics

## Technologies Used

### Frontend
- HTML
- CSS
- JavaScript
- Leaflet.js

### Backend
- Python
- Flask

### Database
- SQLite

### APIs
- OpenStreetMap Nominatim
- OSRM Routing API

## Project Modules

1. Home
2. Route Planner
3. Route Optimization
4. Map Display
5. Delivery History
6. Status Management
7. Dashboard
8. About
9. Contact

## Project Structure

```text
Localized-Delivery-Route-Planner/
│
├── static/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── script.js
│   └── images/
│       └── favicon.svg
│
├── templates/
│   ├── index.html
│   ├── planner.html
│   ├── result.html
│   ├── about.html
│   ├── contact.html
│   ├── history.html
│   ├── dashboard.html
│   └── navbar.html
│
├── app.py
├── database.db
├── requirements.txt
└── README.md