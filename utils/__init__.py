"""
Outlast utils - API client and helpers for Outlast.

Install from same repo (e.g. in Cloud Functions):
  pip install 'outlast-utils @ git+https://github.com/YOUR_ORG/Outlast.git@main#subdirectory=outlast/utils'

Usage:
  from outlast_utils import OutlastClient
"""

from .create_record import OutlastClient

__all__ = ["OutlastClient"]
