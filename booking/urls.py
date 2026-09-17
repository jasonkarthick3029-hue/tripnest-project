from django.urls import path

from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("api/search/flights", views.search_flights, name="search_flights"),
    path("api/search/hotels", views.search_hotels, name="search_hotels"),
    path("api/search/buses", views.search_buses, name="search_buses"),
    path("api/register", views.register_view, name="register"),
    path("api/login", views.login_view, name="login"),
    path("api/logout", views.logout_view, name="logout"),
    path("api/me", views.me_view, name="me"),
    path("api/book", views.book_view, name="book"),
    path("api/my-bookings", views.my_bookings_view, name="my_bookings"),
    path("api/cancel-booking", views.cancel_booking_view, name="cancel_booking"),
    path("api/check-in", views.checkin_view, name="checkin"),
    path("api/flight-status", views.flight_status_view, name="flight_status"),
]
