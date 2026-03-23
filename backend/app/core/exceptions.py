class AppError(Exception):
    """
    Base class for application-level errors.
    """

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)


class ValidationError(AppError):
    def __init__(self, message: str = "Validation failed"):
        super().__init__(message, status_code=422)


class ConflictError(AppError):
    def __init__(self, message: str = "Conflict occurred"):
        super().__init__(message, status_code=409)