"""
Outlast API - Create Record Function

This module provides a function to create records in Outlast using the tRPC API.
"""

import requests
from typing import Optional, Dict, Any, List
from datetime import datetime


class OutlastClient:
    """Client for interacting with the Outlast API."""

    def __init__(
        self,
        base_url: str = "http://localhost:3000",
        access_key_id: Optional[str] = None,
        access_key_secret: Optional[str] = None,
    ):
        """
        Initialize the Outlast API client.

        Args:
            base_url: The base URL of the Outlast API server
            access_key_id: Your Outlast access key ID
            access_key_secret: Your Outlast access key secret
        """
        self.base_url = base_url.rstrip("/")
        self.access_key_id = access_key_id
        self.access_key_secret = access_key_secret
        self.access_token: Optional[str] = None

    def authenticate(self) -> str:
        """
        Authenticate with the API using access key credentials.

        Returns:
            The access token

        Raises:
            requests.HTTPError: If authentication fails
        """
        if not self.access_key_id or not self.access_key_secret:
            raise ValueError("access_key_id and access_key_secret are required")

        url = f"{self.base_url}/trpc/identity.auth.exchangeApiKey"
        
        # Send the payload directly as JSON (tRPC format for mutations)
        payload = {
            "accessKeyId": self.access_key_id,
            "accessKeySecret": self.access_key_secret,
        }

        response = requests.post(url, json=payload)
        
        # Debug: print response details
        if response.status_code >= 400:
            print(f"Status Code: {response.status_code}")
            print(f"Response Headers: {dict(response.headers)}")
            print(f"Response Body: {response.text}")
            
            try:
                error_data = response.json()
                error_msg = f"Authentication failed ({response.status_code}): {error_data}"
            except:
                error_msg = f"Authentication failed ({response.status_code}): {response.text}"
            raise requests.HTTPError(error_msg, response=response)
        
        response.raise_for_status()

        data = response.json()
        # Response format: { "result": { "data": { "accessToken": "..." } } }
        self.access_token = data["result"]["data"]["accessToken"]
        return self.access_token

    def create_record(
        self,
        title: str,
        source_system: str,
        source_record_id: str,
        record_type: str = "GENERIC",
        status: str = "OPEN",
        priority: Optional[str] = None,
        risk: Optional[str] = None,
        contact_id: Optional[str] = None,
        due_at: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        raw_data: Optional[Dict[str, Any]] = None,
        workflow_ids: Optional[List[str]] = None,
        allow_overwrite: bool = False,
        overwrite_fields: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Create a new record in Outlast.

        Args:
            title: The record title (required)
            source_system: Source system identifier (e.g., "SALESFORCE", "MANUAL", "STRIPE")
            source_record_id: Unique identifier from the source system
            record_type: Type of record (default: "GENERIC", options: "INVOICE", "TICKET", "SHIPMENT", etc.)
            status: Record status (default: "OPEN", options: "BLOCKED", "RESOLVED", "CANCELLED")
            priority: Priority level (options: "LOW", "MEDIUM", "HIGH", "URGENT")
            risk: Risk level (options: "LOW", "MEDIUM", "HIGH", "CRITICAL")
            contact_id: UUID of the associated contact
            due_at: Due date in ISO 8601 format (e.g., "2026-02-15T00:00:00Z")
            metadata: Additional structured data as a dictionary
            raw_data: Raw data from the source system as a dictionary
            workflow_ids: List of workflow UUIDs to associate with this record
            allow_overwrite: If True, update existing record with same sourceRecordId
            overwrite_fields: List of field paths to update when allow_overwrite is True

        Returns:
            The created record as a dictionary

        Raises:
            requests.HTTPError: If the API request fails
            ValueError: If required fields are missing
        """
        if not self.access_token:
            self.authenticate()

        url = f"{self.base_url}/trpc/createRecord"

        # Build the payload
        payload: Dict[str, Any] = {
            "title": title,
            "type": record_type,
            "sourceSystem": source_system,
            "sourceRecordId": source_record_id,
            "status": status,
        }

        # Add optional fields
        if priority:
            payload["priority"] = priority
        if risk:
            payload["risk"] = risk
        if contact_id:
            payload["contactId"] = contact_id
        if due_at:
            payload["dueAt"] = due_at
        if metadata:
            payload["metadata"] = metadata
        if raw_data:
            payload["rawData"] = raw_data
        if workflow_ids:
            payload["workflowIds"] = workflow_ids
        if allow_overwrite:
            payload["allowOverwrite"] = allow_overwrite
        if overwrite_fields:
            payload["overwriteFields"] = overwrite_fields

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}",
            "x-access-key-id": self.access_key_id,
        }

        try:
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
        except requests.HTTPError as e:
            # Try to get error details from response
            try:
                error_data = response.json()
                error_msg = f"Create record failed: {error_data}"
            except:
                error_msg = f"Create record failed: {response.text}"
            raise requests.HTTPError(error_msg, response=response) from e

        return response.json()["result"]["data"]


# Example usage
if __name__ == "__main__":
    # Initialize the client
    client = OutlastClient(
        base_url="http://localhost:3000",
        access_key_id="YOUR_ACCESS_KEY_ID",
        access_key_secret="YOUR_ACCESS_KEY_SECRET",
    )

    # Example 1: Create a simple record
    record = client.create_record(
        title="Invoice INV-2026-001",
        source_system="SALESFORCE",
        source_record_id="SF-OPP-12345",
        record_type="INVOICE",
        status="OPEN",
        priority="HIGH",
        due_at="2026-02-15T00:00:00Z",
        metadata={
            "amount": 5000.00,
            "currency": "USD",
            "sku": "PROD-001",
        },
    )
    print(f"Created record: {record['id']} - {record['title']}")

    # Example 2: Update an existing record (upsert)
    updated_record = client.create_record(
        title="Invoice INV-2026-001",
        source_system="SALESFORCE",
        source_record_id="SF-OPP-12345",  # Same ID triggers upsert
        record_type="INVOICE",
        status="BLOCKED",
        metadata={"amount": 6000.00},
        allow_overwrite=True,
        overwrite_fields=["status", "metadata.amount"],
    )
    print(f"Updated record: {updated_record['id']}")

    # Example 3: Create a record with workflows
    record_with_workflow = client.create_record(
        title="Support Ticket #12345",
        source_system="ZENDESK",
        source_record_id="TICKET-12345",
        record_type="TICKET",
        status="OPEN",
        priority="URGENT",
        workflow_ids=["workflow-uuid-1", "workflow-uuid-2"],
        metadata={
            "customer_email": "customer@example.com",
            "issue_type": "billing",
        },
    )
    print(f"Created record with workflows: {record_with_workflow['id']}")
