import random
import string

from django.conf import settings
from django.db import models


class Flight(models.Model):
    airline = models.CharField(max_length=100)
    flight_number = models.CharField(max_length=20)
    origin = models.CharField(max_length=100)
    destination = models.CharField(max_length=100)
    departure_time = models.TimeField()
    arrival_time = models.TimeField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    seats_available = models.PositiveIntegerField(default=50)
    travel_date = models.DateField()


    def __str__(self):
        return f"{self.airline} {self.flight_number} ({self.origin} → {self.destination})"


class Hotel(models.Model):
    name = models.CharField(max_length=150)
    city = models.CharField(max_length=100)
    address = models.CharField(max_length=255, blank=True)
    price_per_night = models.DecimalField(max_digits=10, decimal_places=2)
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=4.0)
    rooms_available = models.PositiveIntegerField(default=10)
    image_seed = models.CharField(max_length=50, default="hotel")


    def __str__(self):
        return f"{self.name}, {self.city}"


class Bus(models.Model):
    operator = models.CharField(max_length=150)
    bus_type = models.CharField(max_length=50)
    origin = models.CharField(max_length=100)
    destination = models.CharField(max_length=100)
    departure_time = models.TimeField()
    arrival_time = models.TimeField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    seats_available = models.PositiveIntegerField(default=40)
    travel_date = models.DateField()


    def __str__(self):
        return f"{self.operator} ({self.origin} → {self.destination})"


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    phone = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"Profile - {self.user.username}"


def generate_booking_ref():
    return "TRV" + "".join(random.choices(string.ascii_uppercase + string.digits, k=7))


class Booking(models.Model):
    BOOKING_TYPES = [
        ("flight", "Flight"),
        ("hotel", "Hotel"),
        ("bus", "Bus"),
    ]
    STATUS_CHOICES = [
        ("confirmed", "Confirmed"),
        ("cancelled", "Cancelled"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookings")
    booking_type = models.CharField(max_length=10, choices=BOOKING_TYPES)
    item_id = models.PositiveIntegerField()
    item_name = models.CharField(max_length=255)
    booking_ref = models.CharField(max_length=20, unique=True, default=generate_booking_ref)
    passenger_name = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField(default=1)
    checked_in = models.BooleanField(default=False)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="confirmed")
    created_at = models.DateTimeField(auto_now_add=True)


    def __str__(self):
        return f"{self.booking_ref} ({self.booking_type})"
