"""Where player photos and reference photos live: S3-compatible storage or a local folder."""

import asyncio
from pathlib import Path
from typing import Any, Protocol

from app.settings import Settings


class PhotoStorage(Protocol):
    async def fetch(self, key: str) -> bytes: ...

    async def put(self, key: str, data: bytes, content_type: str = "image/jpeg") -> None: ...

    async def delete(self, key: str) -> None: ...


class LocalStorage:
    """Dev fallback until local S3 exists: keys are paths relative to `root`."""

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


class S3Storage:
    def __init__(self, settings: Settings) -> None:
        import boto3

        self.bucket = settings.s3_bucket
        self.client: Any = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
        )

    async def fetch(self, key: str) -> bytes:
        def _get() -> bytes:
            obj = self.client.get_object(Bucket=self.bucket, Key=key)
            return bytes(obj["Body"].read())

        return await asyncio.to_thread(_get)

    async def put(self, key: str, data: bytes, content_type: str = "image/jpeg") -> None:
        await asyncio.to_thread(self.client.put_object, Bucket=self.bucket, Key=key, Body=data,
                                ContentType=content_type)

    async def delete(self, key: str) -> None:
        await asyncio.to_thread(self.client.delete_object, Bucket=self.bucket, Key=key)


def build_storage(settings: Settings) -> PhotoStorage:
    if settings.storage_backend == "s3":
        return S3Storage(settings)
    return LocalStorage(settings.storage_local_root)
