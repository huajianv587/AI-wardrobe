from __future__ import annotations

import sys

from services import task_queue_service


def main() -> None:
    queue_names = [name for name in sys.argv[1:] if name.strip()]
    task_queue_service.start_worker(queue_names or None)


if __name__ == "__main__":
    main()
