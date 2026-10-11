"""Player photos live in a local folder shared by the API, its worker and the ML worker.

Keys are paths relative to the root (`attempts/<id>.jpg`, `refs/<place>/<file>.jpg`).
"""

import uuid
from collections.abc import AsyncIterator
from functools import lru_cache
from pathlib import Path
from typing import Protocol

import anyio

from app.core.config import get_settings


class TooLarge(Exception):
    pass


class Storage(Protocol):
    async def save(self, key: str, chunks: AsyncIterator[bytes], max_bytes: int) -> None: ...
    async def exists(self, key: str) -> bool: ...
    async def delete(self, key: str) -> None: ...


class LocalStorage:
    def __init__(self, root: str | Path) -> None:
        self.root = Path(root).resolve()

    def _path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if not path.is_relative_to(self.root):
            raise ValueError(f"key escapes storage root: {key}")
        return path

    async def save(self, key: str, chunks: AsyncIterator[bytes], max_bytes: int) -> None:
        """Streams into a temp file next to the target, then renames, so readers never see half
        a photo. Raises TooLarge (keeping nothing) once more than `max_bytes` arrive."""
        path = anyio.Path(self._path(key))
        tmp = path.with_name(f".{path.name}.{uuid.uuid4().hex}.part")
        await path.parent.mkdir(parents=True, exist_ok=True)
        try:
            size = 0
            async with await tmp.open("wb") as f:
                async for chunk in chunks:
                    size += len(chunk)
                    if size > max_bytes:
                        raise TooLarge
                    await f.write(chunk)
            await tmp.replace(path)
        except BaseException:
            await tmp.unlink(missing_ok=True)
            raise

    async def exists(self, key: str) -> bool:
        return await anyio.to_thread.run_sync(self._path(key).is_file)

    async def delete(self, key: str) -> None:
        await anyio.to_thread.run_sync(lambda: self._path(key).unlink(missing_ok=True))


@lru_cache
def get_storage() -> Storage:
    return LocalStorage(get_settings().storage_local_root)
