import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from tests.direct_test import test_direct

if __name__ == "__main__":
    test_direct()
