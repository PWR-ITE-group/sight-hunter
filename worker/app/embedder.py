"""Image embeddings. One model instance per worker process, loaded at startup."""

import io
from typing import Protocol

import numpy as np
import torch
from PIL import Image, ImageOps

EMBEDDING_DIM = 768


def load_image(data: bytes) -> Image.Image:
    """Decode bytes, apply the EXIF rotation phones write, convert to RGB."""
    img: Image.Image = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)
    return img.convert("RGB")


def _normalize(v: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(v))
    return v / norm if norm > 0 else v


class Embedder(Protocol):
    dim: int

    def embed(self, img: Image.Image) -> np.ndarray:
        """Return an L2-normalized float32 vector of length `dim`."""
        ...


class DinoV2Embedder:
    """DINOv2 CLS embedding. Works well for place recognition without fine-tuning (AnyLoc)."""

    def __init__(self, model_name: str = "facebook/dinov2-base", device: str = "cpu",
                 flip_tta: bool = True) -> None:
        from transformers import AutoImageProcessor, AutoModel

        # No center crop: buildings are often at the edge of the frame.
        self.processor = AutoImageProcessor.from_pretrained(  # type: ignore[no-untyped-call]
            model_name, do_center_crop=False, size={"shortest_edge": 224}
        )
        self.model = AutoModel.from_pretrained(model_name).to(device).eval()
        self.device = device
        self.flip_tta = flip_tta
        self.dim = int(self.model.config.hidden_size)

    @torch.inference_mode()
    def embed(self, img: Image.Image) -> np.ndarray:
        images = [img, ImageOps.mirror(img)] if self.flip_tta else [img]
        inputs = self.processor(images=images, return_tensors="pt").to(self.device)
        out = self.model(**inputs)
        vecs = torch.nn.functional.normalize(out.pooler_output, dim=-1)
        v = vecs.mean(dim=0).cpu().numpy().astype(np.float32)
        return _normalize(v)


class OpenClipEmbedder:
    """Only for comparing against DINOv2 in calibrate; dimension differs from place_refs."""

    def __init__(self, model_name: str = "ViT-B-32", pretrained: str = "laion2b_s34b_b79k",
                 device: str = "cpu") -> None:
        import open_clip

        model, _, preprocess = open_clip.create_model_and_transforms(
            model_name, pretrained=pretrained
        )
        self.model = model.to(device).eval()
        self.preprocess = preprocess
        self.device = device
        self.dim = int(self.model.visual.output_dim)

    @torch.inference_mode()
    def embed(self, img: Image.Image) -> np.ndarray:
        x = self.preprocess(img).unsqueeze(0).to(self.device)
        v = self.model.encode_image(x)[0].cpu().numpy().astype(np.float32)
        return _normalize(v)


def build_embedder(model_name: str, device: str = "cpu", flip_tta: bool = True) -> Embedder:
    if model_name.startswith("clip:"):
        return OpenClipEmbedder(model_name.removeprefix("clip:"), device=device)
    return DinoV2Embedder(model_name, device=device, flip_tta=flip_tta)
