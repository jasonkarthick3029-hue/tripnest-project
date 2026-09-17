# TripNest — Complete Django + MySQL Travel Booking Demo

TripNest is a portfolio/demo travel booking application built with **Django 5**, **MySQL**, HTML, CSS and vanilla JavaScript.

It supports:

- Flight search by route and date
- Hotel search by city and stay dates
- Bus search by route and date
- Django session login/register/logout
- Server-side booking and price calculation
- Flight seat and hotel room availability
- Booking confirmation with unique reference
- My Bookings / Manage Booking
- Booking cancellation with availability restoration
- Flight online check-in demo
- Flight status lookup
- Django admin for travel inventory and bookings
- Responsive TripNest UI

## Project structure

```text
tripnest_django/
├── manage.py
├── requirements.txt
├── README.md
├── tripnest_project/
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
└── booking/
    ├── admin.py
    ├── models.py
    ├── views.py
    ├── urls.py
    ├── migrations/
    │   ├── 0001_initial.py
    │   └── 0002_profile_booking_fields.py
    ├── management/commands/seed_data.py
    ├── templates/booking/
    └── static/booking/
        ├── css/style.css
        └── js/script.js
```

## 1. Create the MySQL database

Open MySQL:

```sql
CREATE DATABASE tripnest_django CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 2. Create and activate the virtual environment

Windows:

```bat
python -m venv venv
venv\Scripts\activate
```

## 3. Install packages

```bat
pip install -r requirements.txt
```

## 4. Configure the MySQL password

The project intentionally does **not** store a real database password in source code.

Windows CMD:

```bat
set TRIPNEST_DB_PASSWORD=your_mysql_password
```

PowerShell:

```powershell
$env:TRIPNEST_DB_PASSWORD="your_mysql_password"
```

Alternatively, edit the `DATABASES` section in `tripnest_project/settings.py` for your local machine.

## 5. Run migrations

```bat
python manage.py makemigrations
python manage.py migrate
```

## 6. Load demo data

```bat
python manage.py seed_data
```

This creates multiple demo flights and buses for the next three days, plus hotels in popular demo cities.

## 7. Create an admin user

```bat
python manage.py createsuperuser
```

## 8. Start the server

```bat
python manage.py runserver
```

Open:

```text
http://127.0.0.1:8000/
```

Admin:

```text
http://127.0.0.1:8000/admin/
```

## Demo flow

```text
Home
  ↓
Schedule Your Trip
  ↓
Flights / Hotels / Buses
  ↓
Search
  ↓
Results
  ↓
Book Now
  ↓
Login / Register
  ↓
Booking confirmation
  ↓
Booking reference
  ↓
My Bookings
  ↓
Cancel booking / Check-in
```

## Useful demo searches

After running `seed_data`, use a date from the next three days.

### Flights

```text
Delhi → Mumbai
Delhi → Goa
Mumbai → Bengaluru
Bengaluru → Delhi
```

### Hotels

```text
Goa
Mumbai
Jaipur
Manali
Udaipur
Delhi
```

### Buses

```text
Delhi → Manali
Bengaluru → Chennai
Mumbai → Pune
Delhi → Jaipur
```

## Important

This is a **demo/portfolio application**, not a production airline, hotel or bus reservation system. Production deployment would additionally need payment integration, email/SMS notifications, stronger inventory rules, rate limiting, audit logging, deployment security and real supplier APIs.
