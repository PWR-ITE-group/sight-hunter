from datetime import UTC, datetime, timedelta
from functools import lru_cache
from typing import TYPE_CHECKING, Protocol

import anyio
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.core.config import get_settings

if TYPE_CHECKING:  # type stubs only; not installed in the runtime image
    from types_boto3_s3 import S3Client


class Storage(Protocol):
    """Player photos never pass through the API: the phone PUTs straight to the bucket."""

    async def presign_put(self, key: str, content_type: str) -> tuple[str, datetime]: ...
    async def exists(self, key: str) -> bool: ...
    async def delete(self, key: str) -> None: ...


def _client(endpoint: str) -> "S3Client":
    s = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=s.s3_access_key,
        aws_secret_access_key=s.s3_secret_key,
        region_name=s.s3_region,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


class S3Storage:
    def __init__(self) -> None:
        s = get_settings()
        self.bucket = s.s3_bucket
        self._internal = _client(s.s3_endpoint)
        # Signature covers the host, so URLs for the phone are signed by a client that points
        # at the public endpoint.
        self._public = (
            self._internal
            if s.public_s3_endpoint == s.s3_endpoint
            else _client(s.public_s3_endpoint)
        )

    async def presign_put(self, key: str, content_type: str) -> tuple[str, datetime]:
        ttl = get_settings().upload_url_ttl_s
        url = await anyio.to_thread.run_sync(
            lambda: self._public.generate_presigned_url(
                "put_object",
                Params={"Bucket": self.bucket, "Key": key, "ContentType": content_type},
                ExpiresIn=ttl,
            )
        )
        return url, datetime.now(UTC) + timedelta(seconds=ttl)

    async def exists(self, key: str) -> bool:
        def head() -> bool:
            try:
                self._internal.head_object(Bucket=self.bucket, Key=key)
                return True
            except ClientError as e:
                if e.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
                    return False
                raise

        return await anyio.to_thread.run_sync(head)

    async def delete(self, key: str) -> None:
        await anyio.to_thread.run_sync(
            lambda: self._internal.delete_object(Bucket=self.bucket, Key=key)
        )


@lru_cache
def get_storage() -> Storage:
    return S3Storage()
