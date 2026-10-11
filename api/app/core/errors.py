from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# Error codes are part of the OpenAPI contract; messages are shown to the player, in Polish.
MESSAGES: dict[str, str] = {
    "too_far": "Podejdź bliżej, jesteś {distance_m} m od celu.",
    "wrong_place": "To {place_name}, szukaj dalej.",
    "insufficient_points": "Za mało punktów.",
    "email_taken": "Ten e-mail jest już zajęty.",
    "invalid_credentials": "Nieprawidłowy e-mail lub hasło.",
    "nickname_taken": "Ten nick jest już zajęty.",
    "rate_limited": "Za dużo prób. Spróbuj za chwilę.",
    "attempts_limit": "Wykorzystałeś wszystkie próby w tej rundzie.",
    "mock_location": "Wykryto fałszywą lokalizację.",
    "no_hints_left": "Nie ma więcej podpowiedzi.",
    "round_not_active": "Ta runda nie jest aktywna.",
    "upload_missing": "Zdjęcie nie zostało jeszcze przesłane.",
    "upload_forbidden": "Link do przesłania zdjęcia wygasł. Spróbuj ponownie.",
    "upload_not_expected": "To zdjęcie zostało już przesłane.",
    "upload_too_large": "Zdjęcie jest za duże.",
    "upload_not_image": "To nie jest zdjęcie.",
    "already_played": "Dzisiaj już grałeś.",
    "unauthorized": "Zaloguj się ponownie.",
    "not_found": "Nie znaleziono.",
    "validation_error": "Nieprawidłowe dane.",
}


class AppError(Exception):
    def __init__(
        self,
        code: str,
        status_code: int,
        details: dict[str, Any] | None = None,
        message: str | None = None,
    ) -> None:
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        template = message or MESSAGES.get(code, MESSAGES["validation_error"])
        try:
            self.message = template.format(**self.details)
        except (KeyError, IndexError):
            self.message = template
        super().__init__(self.message)

    def body(self) -> dict[str, Any]:
        out: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.details:
            out["details"] = self.details
        return out


def not_found(what: str = "resource") -> AppError:
    return AppError("not_found", status.HTTP_404_NOT_FOUND, {"resource": what})


def unauthorized() -> AppError:
    return AppError("unauthorized", status.HTTP_401_UNAUTHORIZED)


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        headers = {"WWW-Authenticate": "Bearer"} if exc.status_code == 401 else None
        return JSONResponse(exc.body(), status_code=exc.status_code, headers=headers)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        err = AppError(
            "validation_error",
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            {"errors": [{"loc": list(e["loc"]), "msg": e["msg"]} for e in exc.errors()]},
        )
        return JSONResponse(err.body(), status_code=err.status_code)
