import math
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import cast, func


def geo_point(lng: float, lat: float) -> Any:
    """A geography point, so PostGIS distances come out in metres."""
    return cast(func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326), Geography)


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in metres, for values the API computes without the database."""
    r = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))
