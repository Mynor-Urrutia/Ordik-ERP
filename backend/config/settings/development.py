from decouple import config
from .base import *

DEBUG = True
ALLOWED_HOSTS = ["*"]

DATABASES["default"].update(
    {
        "NAME": config("DB_NAME", default="erp_dev"),
        "USER": config("DB_USER", default="root"),
        "PASSWORD": config("DB_PASSWORD", default=""),
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="3306"),
    }
)

CORS_ALLOW_ALL_ORIGINS = True
