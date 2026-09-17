import datetime

from django.core.management.base import BaseCommand

from booking.models import Bus, Flight, Hotel


class Command(BaseCommand):
    help = "Loads realistic TripNest demo flights, hotels and buses."

    def handle(self, *args, **options):
        today = datetime.date.today()
        d1 = today + datetime.timedelta(days=1)
        d2 = today + datetime.timedelta(days=2)
        d3 = today + datetime.timedelta(days=3)

        Flight.objects.all().delete()
        Hotel.objects.all().delete()
        Bus.objects.all().delete()

        flight_templates = [
            ("IndiGo", "6E-201", "Delhi", "Mumbai", "06:00", "08:10", 4599, 42),
            ("Air India", "AI-887", "Delhi", "Mumbai", "09:15", "11:25", 5299, 30),
            ("SpiceJet", "SG-455", "Delhi", "Mumbai", "14:30", "16:40", 3999, 18),
            ("Vistara", "UK-995", "Mumbai", "Bengaluru", "07:45", "09:20", 4899, 25),
            ("IndiGo", "6E-330", "Bengaluru", "Delhi", "18:00", "20:35", 5599, 12),
            ("Air India", "AI-642", "Delhi", "Goa", "10:30", "13:10", 3799, 36),
        ]
        flights = []
        for travel_date in (d1, d2, d3):
            for airline, number, origin, destination, dep, arr, price, seats in flight_templates:
                flights.append(Flight(
                    airline=airline,
                    flight_number=number,
                    origin=origin,
                    destination=destination,
                    departure_time=dep,
                    arrival_time=arr,
                    price=price,
                    seats_available=seats,
                    travel_date=travel_date,
                ))
        Flight.objects.bulk_create(flights)

        Hotel.objects.bulk_create([
            Hotel(name="The Grand Palace", city="Goa", address="Calangute Beach Road", price_per_night=6200, rating=4.5, rooms_available=8, image_seed="hotel1"),
            Hotel(name="Sunset Resort & Spa", city="Goa", address="Baga Beach", price_per_night=8500, rating=4.7, rooms_available=5, image_seed="hotel2"),
            Hotel(name="City Comfort Inn", city="Mumbai", address="Andheri East", price_per_night=3200, rating=4.0, rooms_available=15, image_seed="hotel3"),
            Hotel(name="Royal Heritage Hotel", city="Jaipur", address="MI Road", price_per_night=4500, rating=4.3, rooms_available=10, image_seed="hotel4"),
            Hotel(name="Mountain View Lodge", city="Manali", address="Old Manali", price_per_night=2800, rating=4.2, rooms_available=12, image_seed="hotel5"),
            Hotel(name="Lakeside Retreat", city="Udaipur", address="Lake Pichola", price_per_night=7100, rating=4.6, rooms_available=6, image_seed="hotel6"),
            Hotel(name="Taj City View", city="Delhi", address="Diplomatic Enclave", price_per_night=7800, rating=4.8, rooms_available=7, image_seed="hotel7"),
        ])

        bus_templates = [
            ("National Travels", "AC Sleeper", "Delhi", "Manali", "20:00", "08:00", 1499, 22),
            ("SRS Travels", "AC Seater", "Bengaluru", "Chennai", "22:30", "05:00", 899, 30),
            ("VRL Travels", "Non-AC Sleeper", "Mumbai", "Pune", "23:00", "02:30", 599, 35),
            ("Orange Tours", "AC Sleeper", "Delhi", "Jaipur", "21:15", "02:45", 799, 20),
        ]
        buses = []
        for travel_date in (d1, d2, d3):
            for operator, bus_type, origin, destination, dep, arr, price, seats in bus_templates:
                buses.append(Bus(
                    operator=operator,
                    bus_type=bus_type,
                    origin=origin,
                    destination=destination,
                    departure_time=dep,
                    arrival_time=arr,
                    price=price,
                    seats_available=seats,
                    travel_date=travel_date,
                ))
        Bus.objects.bulk_create(buses)

        self.stdout.write(self.style.SUCCESS(
            f"TripNest demo data loaded for {d1}, {d2} and {d3}."
        ))
