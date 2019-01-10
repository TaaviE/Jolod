# coding=utf-8
# author=Taavi Eomäe
import datetime
import sys
from base64 import urlsafe_b64decode, urlsafe_b64encode, b64decode, b64encode
from json import dumps, loads
from logging import info

from Cryptodome.Cipher.AES import new, MODE_GCM

from config import Config


def decrypt_id(encrypted_user_id: str) -> str:
    base64_raw_data = urlsafe_b64decode(encrypted_user_id).decode()
    data = loads(base64_raw_data)
    ciphertext = b64decode(data[0])
    nonce = b64decode(data[1])
    tag = b64decode(data[2])
    cipher = new(Config.AES_KEY, MODE_GCM, nonce=nonce)
    plaintext = cipher.decrypt(ciphertext).decode()

    try:
        cipher.verify(tag)
        info("The message is authentic: {}".format(plaintext))
    except ValueError:
        info("Key incorrect or message corrupted!")

    return plaintext


def encrypt_id(user_id: int) -> str:
    cipher = new(Config.AES_KEY, MODE_GCM)
    ciphertext, tag = cipher.encrypt_and_digest(bytes(str(user_id), encoding="utf8"))
    nonce = b64encode(cipher.nonce).decode()
    ciphertext = b64encode(ciphertext).decode()
    tag = b64encode(tag).decode()
    json_package = dumps([ciphertext, nonce, tag])
    packed = urlsafe_b64encode(bytes(json_package, "utf8")).decode()
    return packed


christmasy_emojis = ["🎄", "🎅", "🤶", "🦌", "🍪", "🌟", "❄️", "☃️", "⛄", "🎁", "🎶", "🕯️", "🔥", "🥶", "🧣", "🧥",
                     "🌲", "🌁", "🌬️", "🎿", "🏔️", "🌨️", "🏂", "⛷️"]


def get_christmasy_emoji(user_id: int) -> str:
    if user_id is not None:
        emoji = christmasy_emojis[int(user_id) % len(christmasy_emojis)]
    else:
        emoji = ""
    return emoji


def get_timestamp() -> str:
    return str(datetime.datetime.isoformat(datetime.datetime.now()))


def set_recursionlimit() -> None:
    sys.setrecursionlimit(2000)
