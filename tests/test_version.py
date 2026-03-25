"""Version alignment tests for nexus-attest."""

import re
import tomllib
from pathlib import Path

import nexus_attest


def test_version_is_semver():
    assert re.match(r"^\d+\.\d+\.\d+", nexus_attest.__version__)


def test_version_at_least_1_0_0():
    major = int(nexus_attest.__version__.split(".")[0])
    assert major >= 1


def test_version_matches_pyproject():
    pyproject = Path(__file__).parent.parent / "pyproject.toml"
    with open(pyproject, "rb") as f:
        data = tomllib.load(f)
    assert nexus_attest.__version__ == data["project"]["version"]
