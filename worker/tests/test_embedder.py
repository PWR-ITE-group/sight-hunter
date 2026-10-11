import io

import numpy as np
from PIL import Image

from app.embedder import EMBEDDING_DIM, TinyEmbedder, build_embedder, load_image


def gradient(color: tuple[int, int, int]) -> bytes:
    arr = np.zeros((64, 64, 3), dtype=np.uint8)
    for i in range(64):
        arr[i, :, :] = [int(c * i / 63) for c in color]
    buf = io.BytesIO()
    Image.fromarray(arr).save(buf, "JPEG", quality=95)
    return buf.getvalue()


def test_tiny_embedder_matches_place_refs_width_and_is_unit_length() -> None:
    e = build_embedder("tiny")
    assert isinstance(e, TinyEmbedder)
    v = e.embed(load_image(gradient((255, 40, 40))))
    assert v.shape == (EMBEDDING_DIM,) and v.dtype == np.float32
    assert abs(float(np.linalg.norm(v)) - 1.0) < 1e-5


def test_tiny_embedder_same_bytes_identical_other_colour_far_apart() -> None:
    e = TinyEmbedder()
    red, red_again, blue = (
        e.embed(load_image(gradient((255, 40, 40)))),
        e.embed(load_image(gradient((255, 40, 40)))),
        e.embed(load_image(gradient((40, 40, 255)))),
    )
    assert float(red @ red_again) > 0.9999
    assert float(red @ blue) < 0.35  # below t_low: a different photo is `not_matched`
