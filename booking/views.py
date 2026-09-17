import json
import random
from datetime import date
from decimal import Decimal, InvalidOperation

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import render
from django.views.decorators.http import require_GET, require_POST

from .models import Booking, Bus, Flight, Hotel, Profile


def json_body(request):
    try:
        return json.loads(request.body or "{}")
    except (TypeError, ValueError, json.JSONDecodeError):
        return None


def home(request):
    get_token(request)
    return render(request, "booking/index.html")


@require_GET
def search_flights(request):
    origin = request.GET.get("origin", "").strip()
    destination = request.GET.get("destination", "").strip()
    travel_date = request.GET.get("travel_date", "").strip()

    qs = Flight.objects.all()
    if origin:
        qs = qs.filter(origin__icontains=origin)
    if destination:
        qs = qs.filter(destination__icontains=destination)
    if travel_date:
        try:
            date.fromisoformat(travel_date)
            qs = qs.filter(travel_date=travel_date)
        except ValueError:
            return JsonResponse({"error": "Invalid travel date"}, status=400)

    qs = qs.order_by("price", "departure_time")

    return JsonResponse([
        {
            "id": f.id,
            "airline": f.airline,
            "flight_number": f.flight_number,
            "origin": f.origin,
            "destination": f.destination,
            "departure_time": f.departure_time.strftime("%H:%M"),
            "arrival_time": f.arrival_time.strftime("%H:%M"),
            "price": float(f.price),
            "seats_available": f.seats_available,
            "travel_date": str(f.travel_date),
        }
        for f in qs
    ], safe=False)


@require_GET
def search_hotels(request):
    city = request.GET.get("city", "").strip()

    qs = Hotel.objects.all()
    if city:
        qs = qs.filter(city__icontains=city)

    qs = qs.order_by("-rating", "price_per_night")

    return JsonResponse([
        {
            "id": h.id,
            "name": h.name,
            "city": h.city,
            "address": h.address,
            "price_per_night": float(h.price_per_night),
            "rating": float(h.rating),
            "rooms_available": h.rooms_available,
            "image_seed": h.image_seed,
        }
        for h in qs
    ], safe=False)


@require_GET
def search_buses(request):
    origin = request.GET.get("origin", "").strip()
    destination = request.GET.get("destination", "").strip()
    travel_date = request.GET.get("travel_date", "").strip()

    qs = Bus.objects.all()
    if origin:
        qs = qs.filter(origin__icontains=origin)
    if destination:
        qs = qs.filter(destination__icontains=destination)
    if travel_date:
        try:
            date.fromisoformat(travel_date)
            qs = qs.filter(travel_date=travel_date)
        except ValueError:
            return JsonResponse({"error": "Invalid travel date"}, status=400)

    qs = qs.order_by("price", "departure_time")

    return JsonResponse([
        {
            "id": b.id,
            "operator": b.operator,
            "bus_type": b.bus_type,
            "origin": b.origin,
            "destination": b.destination,
            "departure_time": b.departure_time.strftime("%H:%M"),
            "arrival_time": b.arrival_time.strftime("%H:%M"),
            "price": float(b.price),
            "seats_available": b.seats_available,
            "travel_date": str(b.travel_date),
        }
        for b in qs
    ], safe=False)


@require_POST
def register_view(request):
    data = json_body(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    phone = str(data.get("phone", "")).strip()

    if not name or not email or not password:
        return JsonResponse({"error": "Name, email and password are required"}, status=400)
    if len(password) < 8:
        return JsonResponse({"error": "Password must be at least 8 characters"}, status=400)
    if User.objects.filter(username=email).exists():
        return JsonResponse({"error": "Email already registered"}, status=409)

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=name,
    )
    Profile.objects.create(user=user, phone=phone)
    login(request, user)
    return JsonResponse({"message": "Registered successfully", "name": name})


@require_POST
def login_view(request):
    data = json_body(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    user = authenticate(request, username=email, password=password)

    if user is None:
        return JsonResponse({"error": "Invalid email or password"}, status=401)

    login(request, user)
    return JsonResponse({"message": "Logged in", "name": user.first_name or user.username})


@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"message": "Logged out"})


@require_GET
def me_view(request):
    if request.user.is_authenticated:
        return JsonResponse({"logged_in": True, "name": request.user.first_name or request.user.username})
    return JsonResponse({"logged_in": False})


def _get_item(booking_type, item_id):
    if booking_type == "flight":
        return Flight.objects.get(pk=item_id)
    if booking_type == "hotel":
        return Hotel.objects.get(pk=item_id)
    if booking_type == "bus":
        return Bus.objects.get(pk=item_id)
    raise ValueError("Unsupported booking type")


def _booking_label(booking_type, item):
    if booking_type == "flight":
        return f"{item.airline} {item.flight_number} ({item.origin} → {item.destination})"
    if booking_type == "hotel":
        return f"{item.name}, {item.city}"
    return f"{item.operator} ({item.origin} → {item.destination})"


def _new_booking_ref():
    while True:
        ref = "TRV" + "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", k=7))
        if not Booking.objects.filter(booking_ref=ref).exists():
            return ref


@require_POST
def book_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Please log in to book"}, status=401)

    data = json_body(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    booking_type = data.get("type")
    try:
        item_id = int(data.get("item_id"))
    except (TypeError, ValueError):
        return JsonResponse({"error": "Invalid item"}, status=400)

    passenger_name = str(data.get("passenger_name") or request.user.first_name or request.user.username).strip()
    if booking_type not in {"flight", "hotel", "bus"} or item_id <= 0 or not passenger_name:
        return JsonResponse({"error": "Invalid booking data"}, status=400)

    try:
        with transaction.atomic():
            item = _get_item(booking_type, item_id)
            item = item.__class__.objects.select_for_update().get(pk=item.pk)

            start_date = None
            end_date = None
            quantity = 1

            if booking_type == "hotel":
                checkin = str(data.get("checkin", "")).strip()
                checkout = str(data.get("checkout", "")).strip()
                try:
                    start_date = date.fromisoformat(checkin)
                    end_date = date.fromisoformat(checkout)
                except ValueError:
                    return JsonResponse({"error": "Please provide valid check-in and check-out dates"}, status=400)
                if end_date <= start_date:
                    return JsonResponse({"error": "Check-out must be after check-in"}, status=400)
                if item.rooms_available < 1:
                    return JsonResponse({"error": "No rooms available"}, status=409)
                nights = (end_date - start_date).days
                total_price = item.price_per_night * nights
                item.rooms_available -= 1
            else:
                if item.seats_available < 1:
                    return JsonResponse({"error": "No seats available"}, status=409)
                start_date = item.travel_date
                total_price = item.price
                item.seats_available -= 1

            item.save(update_fields=["rooms_available"] if booking_type == "hotel" else ["seats_available"])

            booking = Booking.objects.create(
                user=request.user,
                booking_type=booking_type,
                item_id=item.pk,
                item_name=_booking_label(booking_type, item),
                booking_ref=_new_booking_ref(),
                passenger_name=passenger_name,
                quantity=quantity,
                start_date=start_date,
                end_date=end_date,
                total_price=total_price,
            )

    except (Flight.DoesNotExist, Hotel.DoesNotExist, Bus.DoesNotExist):
        return JsonResponse({"error": "Selected travel option no longer exists"}, status=404)
    except InvalidOperation:
        return JsonResponse({"error": "Invalid price"}, status=400)

    return JsonResponse({
        "message": "Booking confirmed",
        "booking_ref": booking.booking_ref,
        "total_price": float(booking.total_price),
        "item_name": booking.item_name,
    })


@require_GET
def my_bookings_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Please log in"}, status=401)

    results = []
    for b in request.user.bookings.order_by("-created_at"):
        results.append({
            "id": b.id,
            "booking_type": b.booking_type,
            "item_id": b.item_id,
            "item_name": b.item_name,
            "booking_ref": b.booking_ref,
            "passenger_name": b.passenger_name,
            "quantity": b.quantity,
            "start_date": str(b.start_date) if b.start_date else None,
            "end_date": str(b.end_date) if b.end_date else None,
            "total_price": float(b.total_price),
            "status": b.status,
            "checked_in": b.checked_in,
            "created_at": b.created_at.strftime("%d-%m-%Y %H:%M"),
        })
    return JsonResponse(results, safe=False)


@require_POST
def cancel_booking_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Please log in"}, status=401)

    data = json_body(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    booking_ref = str(data.get("booking_ref", "")).strip().upper()
    if not booking_ref:
        return JsonResponse({"error": "Booking reference is required"}, status=400)

    try:
        with transaction.atomic():
            booking = Booking.objects.select_for_update().get(
                booking_ref=booking_ref,
                user=request.user,
            )
            if booking.status == "cancelled":
                return JsonResponse({"error": "Booking is already cancelled"}, status=409)

            item = _get_item(booking.booking_type, booking.item_id)
            item = item.__class__.objects.select_for_update().get(pk=item.pk)

            if booking.booking_type == "hotel":
                item.rooms_available += booking.quantity
                item.save(update_fields=["rooms_available"])
            else:
                item.seats_available += booking.quantity
                item.save(update_fields=["seats_available"])

            booking.status = "cancelled"
            booking.save(update_fields=["status"])
    except Booking.DoesNotExist:
        return JsonResponse({"error": "Booking not found"}, status=404)
    except (Flight.DoesNotExist, Hotel.DoesNotExist, Bus.DoesNotExist):
        return JsonResponse({"error": "Travel item no longer exists"}, status=404)

    return JsonResponse({"message": "Booking cancelled successfully"})


@require_POST
def checkin_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Please log in"}, status=401)

    data = json_body(request)
    if data is None:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    booking_ref = str(data.get("booking_ref", "")).strip().upper()
    if not booking_ref:
        return JsonResponse({"error": "Booking reference is required"}, status=400)

    try:
        booking = Booking.objects.get(booking_ref=booking_ref, user=request.user)
    except Booking.DoesNotExist:
        return JsonResponse({"error": "Booking not found"}, status=404)

    if booking.booking_type != "flight":
        return JsonResponse({"error": "Online check-in is available for flight bookings only"}, status=400)
    if booking.status != "confirmed":
        return JsonResponse({"error": "Cancelled bookings cannot be checked in"}, status=400)
    if booking.checked_in:
        return JsonResponse({"message": "Already checked in", "checked_in": True})

    booking.checked_in = True
    booking.save(update_fields=["checked_in"])
    return JsonResponse({"message": "Check-in completed successfully", "checked_in": True})


@require_GET
def flight_status_view(request):
    flight_number = request.GET.get("flight_number", "").strip()
    travel_date = request.GET.get("travel_date", "").strip()
    if not flight_number:
        return JsonResponse({"error": "Flight number is required"}, status=400)

    qs = Flight.objects.filter(flight_number__iexact=flight_number)
    if travel_date:
        try:
            date.fromisoformat(travel_date)
        except ValueError:
            return JsonResponse({"error": "Invalid travel date"}, status=400)
        qs = qs.filter(travel_date=travel_date)

    flight = qs.first()
    if not flight:
        return JsonResponse({"error": "Flight not found"}, status=404)

    return JsonResponse({
        "status": "Scheduled",
        "airline": flight.airline,
        "flight_number": flight.flight_number,
        "origin": flight.origin,
        "destination": flight.destination,
        "travel_date": str(flight.travel_date),
        "departure_time": flight.departure_time.strftime("%H:%M"),
        "arrival_time": flight.arrival_time.strftime("%H:%M"),
    })
