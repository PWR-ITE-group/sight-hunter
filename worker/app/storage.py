"""Where player photos and reference photos live: a local folder shared with the API."""

import asyncio
from pathlib import Path
from typing import Protocol

from app.settings import Settings


class PhotoStorage(Protocol):
    async def fetch(self, key: str) -> bytes: ...

    async def put(self, key: str, data: bytes, content_type: str = "image/jpeg") -> None: ...

    async def delete(self, key: str) -> None: ...


class LocalStorage:
    """Keys are paths relative to `root` (the API's STORAGE_LOCAL_ROOT)."""

    def __init__(self, root: str | Path) -> None:
        self.root = Path(root).resolve()

    def _path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if not path.is_relative_to(self.root):
            raise ValueError(f"key escapes storage root: {key}")
        return path

    async def fetch(self, key: str) -> bytes:
        return await asyncio.to_thread(self._path(key).read_bytes)

    async def put(self, key: str, data: bytes, content_type: str = "image/jpeg") -> None:
        path = self._path(key)

        def _write() -> None:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)

        await asyncio.to_thread(_write)

    async def delete(self, key: str) -> None:
        await asyncio.to_thread(self._path(key).unlink, missing_ok=True)


def build_storage(settings: Settings) -> PhotoStorage:
    return LocalStorage(settings.storage_local_root)
