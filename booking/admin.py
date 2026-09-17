from django.contrib import admin

from .models import Flight, Hotel, Bus, Booking, Profile


@admin.register(Flight)
class FlightAdmin(admin.ModelAdmin):
    list_display = ("airline", "flight_number", "origin", "destination", "price", "travel_date", "seats_available")
    list_filter = ("airline", "origin", "destination")
    search_fields = ("airline", "flight_number", "origin", "destination")


@admin.register(Hotel)
class HotelAdmin(admin.ModelAdmin):
    list_display = ("name", "city", "price_per_night", "rating", "rooms_available")
    list_filter = ("city",)
    search_fields = ("name", "city")


@admin.register(Bus)
class BusAdmin(admin.ModelAdmin):
    list_display = ("operator", "bus_type", "origin", "destination", "price", "travel_date", "seats_available")
    list_filter = ("operator", "origin", "destination")
    search_fields = ("operator", "origin", "destination")


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("booking_ref", "user", "booking_type", "item_name", "passenger_name", "total_price", "status", "checked_in", "created_at")
    list_filter = ("booking_type", "status")
    search_fields = ("booking_ref", "passenger_name")


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "phone")
    search_fields = ("user__username", "user__email", "phone")
