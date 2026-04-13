import os
from .base import *

DEBUG = False
SECRET_KEY = os.environ["SECRET_KEY"]
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "").split(",")

DATABASES["default"].update(
    {
        "NAME": os.environ["DB_NAME"],
        "USER": os.environ["DB_USER"],
        "PASSWORD": os.environ["DB_PASSWORD"],
        "HOST": os.environ["DB_HOST"],
    }
)

CORS_ALLOWED_ORIGINS = os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",")
