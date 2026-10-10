"""SQLAdmin at /admin: how content (places, tasks, reels) is loaded in phase 2.

Login is a single admin account from `.env` (ADMIN_USER / ADMIN_PASSWORD); the session cookie
is signed with JWT_SECRET.
"""

import secrets
import struct

from fastapi import FastAPI
from geoalchemy2.elements import WKBElement
from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from wtforms import StringField

from app.core.config import get_settings
from app.core.db import get_engine
from app.modules.auth.models import User
from app.modules.finds.models import Find
from app.modules.media.models import Reel
from app.modules.quests.models import Place, PlaceRef, Task


class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        s = get_settings()
        user, password = str(form.get("username", "")), str(form.get("password", ""))
        ok = secrets.compare_digest(user, s.admin_user) and secrets.compare_digest(
            password, s.admin_password
        )
        if ok:
            request.session.update({"admin": True})
        return ok

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        return bool(request.session.get("admin"))


def wkb_point(value: WKBElement | None) -> str:
    """'lat, lng' from a PostGIS point (EWKB), without pulling in shapely."""
    if value is None:
        return ""
    raw = value.data
    data = bytes.fromhex(raw) if isinstance(raw, str) else bytes(raw)
    little = data[0] == 1
    order = "<" if little else ">"
    (geom_type,) = struct.unpack_from(f"{order}I", data, 1)
    offset = 5 + (4 if geom_type & 0x20000000 else 0)
    x, y = struct.unpack_from(f"{order}dd", data, offset)
    return f"{y:.6f}, {x:.6f}"


class PlaceAdmin(ModelView, model=Place):
    name = "Miejsce"
    name_plural = "Miejsca"
    icon = "fa-solid fa-landmark"
    column_list = [Place.name, Place.era, Place.category, Place.geom, Place.radius_m]
    column_searchable_list = [Place.name]
    column_formatters = {Place.geom: lambda m, _a: wkb_point(m.geom)}
    column_formatters_detail = column_formatters
    # Entered as WKT, e.g. POINT(17.0318 51.1100) — longitude first.
    form_overrides = {"geom": StringField}
    form_args = {"geom": {"label": "geom (WKT: POINT(lng lat))"}}
    form_columns = [Place.name, Place.era, Place.category, Place.geom, Place.radius_m]


class TaskAdmin(ModelView, model=Task):
    name = "Zadanie"
    name_plural = "Zadania"
    icon = "fa-solid fa-puzzle-piece"
    column_list = [Task.riddle, Task.place_id, Task.base_reward_points, Task.base_xp]
    form_columns = [
        Task.place_id,
        Task.riddle,
        Task.archival_photo_url,
        Task.hints,
        Task.base_reward_points,
        Task.base_xp,
    ]


class ReelAdmin(ModelView, model=Reel):
    name = "Rolka"
    name_plural = "Rolki"
    icon = "fa-solid fa-film"
    column_list = [Reel.title, Reel.kind, Reel.place_id, Reel.video_provider, Reel.price_points]
    column_searchable_list = [Reel.title]
    form_columns = [
        Reel.place_id,
        Reel.kind,
        Reel.title,
        Reel.video_provider,
        Reel.playback_url,
        Reel.duration_s,
        Reel.price_points,
    ]


class PlaceRefAdmin(ModelView, model=PlaceRef):
    name = "Zdjęcie referencyjne"
    name_plural = "Zdjęcia referencyjne"
    icon = "fa-solid fa-images"
    can_create = False
    can_edit = False
    column_list = [PlaceRef.place_id, PlaceRef.photo_url, PlaceRef.author, PlaceRef.created_at]
    column_details_exclude_list = [PlaceRef.embedding]


class UserAdmin(ModelView, model=User):
    name = "Gracz"
    name_plural = "Gracze"
    icon = "fa-solid fa-user"
    can_create = False
    can_edit = False
    can_delete = False
    column_list = [User.email, User.nickname, User.ref_code, User.created_at]
    column_searchable_list = [User.email, User.nickname]
    column_details_exclude_list = [User.password_hash]


class FindAdmin(ModelView, model=Find):
    name = "Znalezisko"
    name_plural = "Znaleziska"
    icon = "fa-solid fa-check"
    can_create = False
    can_edit = False
    can_delete = False
    column_list = [Find.user_id, Find.task_id, Find.points_awarded, Find.xp_awarded, Find.found_at]


def setup_admin(app: FastAPI) -> Admin:
    s = get_settings()
    admin = Admin(
        app,
        get_engine(),
        title="Łowcy Historii — admin",
        authentication_backend=AdminAuth(secret_key=s.jwt_secret),
    )
    for view in (PlaceAdmin, TaskAdmin, ReelAdmin, PlaceRefAdmin, UserAdmin, FindAdmin):
        admin.add_view(view)
    return admin
