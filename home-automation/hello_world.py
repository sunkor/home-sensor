"""Example script that prints a greeting and timestamp.

This module is intentionally simple but showcases a few best practices like
keeping code inside a ``main`` function and providing a helpful docstring.
"""

from datetime import datetime


def main() -> None:
    """Print a greeting followed by the current date and time."""
    msg = "hello world"
    print(msg)

    today = datetime.now()
    print(today.strftime("%d/%m/%Y %H:%M:%S"))


if __name__ == "__main__":
    main()
