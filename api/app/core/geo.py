from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import cast, func


def geo_point(lng: float, lat: float) -> Any:
    """A geography point, so PostGIS distances come out in metres."""
    return cast(func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326), Geography)
