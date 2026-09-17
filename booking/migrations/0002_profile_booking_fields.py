from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("booking", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Profile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("phone", models.CharField(blank=True, max_length=20)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="profile", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(model_name="booking", name="checked_in", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="booking", name="end_date", field=models.DateField(blank=True, null=True)),
        migrations.AddField(model_name="booking", name="item_name", field=models.CharField(default="", max_length=255), preserve_default=False),
        migrations.AddField(model_name="booking", name="quantity", field=models.PositiveIntegerField(default=1)),
        migrations.AddField(model_name="booking", name="start_date", field=models.DateField(blank=True, null=True)),
        migrations.AddIndex(model_name="booking", index=models.Index(fields=["user", "status"], name="booking_user_status_idx")),
        migrations.AddIndex(model_name="booking", index=models.Index(fields=["booking_ref"], name="booking_ref_idx")),
    ]
