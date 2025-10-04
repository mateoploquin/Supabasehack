"""Tests for browser automation API routes.

Tests the browser automation endpoints including task execution,
status checking, and session management functionality.
"""

import json
import os
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import get_application


@pytest.fixture
def client() -> TestClient:
    """Create a test client for the FastAPI application.
    
    Returns:
        TestClient: Configured test client for the FastAPI app
    """
    app = get_application()
    return TestClient(app)


@pytest.fixture
def temp_session_dir() -> Path:
    """Create a temporary directory for browser sessions.
    
    Returns:
        Path: Temporary directory path
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        yield Path(temp_dir)


class TestBrowserRoutes:
    """Test class for browser automation routes."""

    @patch("app.api.routes.browser.settings.GOOGLE_API_KEY", "")
    def test_get_browser_status_without_api_key(self, client: TestClient) -> None:
        """Test getting browser status when API key is not configured.
        
        Args:
            client: Test client fixture
        """
        response = client.get("/api/v1/browser/status")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "not_configured"
        assert "Google API key not configured" in data["message"]

    @patch("app.api.routes.browser.settings.GOOGLE_API_KEY", "test_key")
    def test_get_browser_status_with_api_key(self, client: TestClient) -> None:
        """Test getting browser status when API key is configured.
        
        Args:
            client: Test client fixture
        """
        response = client.get("/api/v1/browser/status")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "ready"
        assert "Browser automation service is ready" in data["message"]

    @patch("app.api.routes.browser.settings.GOOGLE_API_KEY", "")
    def test_run_browser_task_without_api_key(self, client: TestClient) -> None:
        """Test running a browser task when API key is not configured.
        
        Args:
            client: Test client fixture
        """
        task_data = {
            "task": "Search for 'test' on Google",
            "max_steps": 10,
            "include_screenshot": False
        }
        
        response = client.post("/api/v1/browser/run-task", json=task_data)
        assert response.status_code == 500
        
        data = response.json()
        assert "Google API key not configured" in data["detail"]

    @patch("app.api.routes.browser.settings.GOOGLE_API_KEY", "test_key")
    def test_run_browser_task_with_execution_error(self, client: TestClient) -> None:
        """Test handling of execution errors during browser automation.
        
        Args:
            client: Test client fixture
        """
        task_data = {
            "task": "Search for 'test' on Google",
            "max_steps": 10,
            "include_screenshot": False
        }
        
        # Mock the browser_use module to raise an exception
        mock_agent = MagicMock()
        mock_agent.run.side_effect = Exception("Browser execution failed")
        
        with patch("browser_use.Agent", return_value=mock_agent), \
             patch("browser_use.ChatGoogle"):
            response = client.post("/api/v1/browser/run-task", json=task_data)
            assert response.status_code == 500
            
            data = response.json()
            assert "Failed to execute browser automation task" in data["detail"]
            assert "Browser execution failed" in data["detail"]

    def test_run_browser_task_invalid_request(self, client: TestClient) -> None:
        """Test running a browser task with invalid request data.
        
        Args:
            client: Test client fixture
        """
        # Missing required field
        invalid_data = {
            "max_steps": 10,
            "include_screenshot": False
        }
        
        response = client.post("/api/v1/browser/run-task", json=invalid_data)
        assert response.status_code == 422  # Validation error
        
        # Invalid max_steps value
        invalid_data = {
            "task": "Search for 'test' on Google",
            "max_steps": 0,  # Should be >= 1
            "include_screenshot": False
        }
        
        response = client.post("/api/v1/browser/run-task", json=invalid_data)
        assert response.status_code == 422  # Validation error

    @patch("app.api.routes.browser.settings.GOOGLE_API_KEY", "test_key")
    def test_run_browser_task_success(self, client: TestClient) -> None:
        """Test successful browser task execution.
        
        Args:
            client: Test client fixture
        """
        task_data = {
            "task": "Search for 'test' on Google",
            "max_steps": 10,
            "include_screenshot": False
        }
        
        # Mock the browser_use module
        mock_agent = AsyncMock()
        mock_history = MagicMock()
        mock_history.final_result.return_value = "Task completed successfully"
        mock_history.errors.return_value = []
        mock_history.urls.return_value = ["https://www.google.com"]
        mock_history.history = [{"step": 1, "action": "navigate"}]
        mock_agent.run.return_value = mock_history
        
        with patch("browser_use.Agent", return_value=mock_agent), \
             patch("browser_use.ChatGoogle"):
            response = client.post("/api/v1/browser/run-task", json=task_data)
            assert response.status_code == 200
            
            data = response.json()
            assert data["success"] is True
            assert data["steps_taken"] == 1
            assert "result" in data
            assert data["final_message"] == "Task completed successfully"
            assert "session_id" in data  # Session should be saved by default

    @patch("app.api.routes.browser.settings.GOOGLE_API_KEY", "test_key")
    def test_run_browser_task_with_session_id(self, client: TestClient, temp_session_dir: Path) -> None:
        """Test running a browser task with an existing session ID.
        
        Args:
            client: Test client fixture
            temp_session_dir: Temporary directory for session files
        """
        # Create a test session file
        session_id = "test-session-id"
        session_file = temp_session_dir / f"{session_id}.json"
        session_data = {
            "cookies": [{"name": "test", "value": "value"}],
            "local_storage": {"key": "value"},
            "session_storage": {"key": "value"}
        }
        with open(session_file, "w") as f:
            json.dump(session_data, f)
        
        task_data = {
            "task": "Continue from previous session",
            "max_steps": 10,
            "include_screenshot": False,
            "session_id": session_id
        }
        
        # Mock the browser_use module
        mock_agent = AsyncMock()
        mock_history = MagicMock()
        mock_history.final_result.return_value = "Task continued successfully"
        mock_history.errors.return_value = []
        mock_history.urls.return_value = ["https://www.example.com"]
        mock_history.history = [{"step": 1, "action": "continue"}]
        mock_agent.run.return_value = mock_history
        
        with patch("browser_use.Agent", return_value=mock_agent), \
             patch("browser_use.ChatGoogle"), \
             patch("app.api.routes.browser.SESSION_DIR", temp_session_dir), \
             patch("app.api.routes.browser.load_browser_session") as mock_load:
            mock_load.return_value = session_data
            
            response = client.post("/api/v1/browser/run-task", json=task_data)
            assert response.status_code == 200
            
            data = response.json()
            assert data["success"] is True
            assert data["steps_taken"] == 1
            assert data["final_message"] == "Task continued successfully"
            assert data["session_id"] == session_id  # Should return the same session ID

    @patch("app.api.routes.browser.settings.GOOGLE_API_KEY", "test_key")
    def test_run_browser_task_without_saving_session(self, client: TestClient) -> None:
        """Test running a browser task without saving the session.
        
        Args:
            client: Test client fixture
        """
        task_data = {
            "task": "Search for 'test' on Google",
            "max_steps": 10,
            "include_screenshot": False,
            "save_session": False
        }
        
        # Mock the browser_use module
        mock_agent = AsyncMock()
        mock_history = MagicMock()
        mock_history.final_result.return_value = "Task completed successfully"
        mock_history.errors.return_value = []
        mock_history.urls.return_value = ["https://www.google.com"]
        mock_history.history = [{"step": 1, "action": "navigate"}]
        mock_agent.run.return_value = mock_history
        
        with patch("browser_use.Agent", return_value=mock_agent), \
             patch("browser_use.ChatGoogle"):
            response = client.post("/api/v1/browser/run-task", json=task_data)
            assert response.status_code == 200
            
            data = response.json()
            assert data["success"] is True
            assert data["steps_taken"] == 1
            assert data["final_message"] == "Task completed successfully"
            assert data["session_id"] is None  # Session should not be saved

    def test_list_browser_sessions(self, client: TestClient, temp_session_dir: Path) -> None:
        """Test listing browser sessions.
        
        Args:
            client: Test client fixture
            temp_session_dir: Temporary directory for session files
        """
        # Create test session files
        for i in range(3):
            session_file = temp_session_dir / f"session-{i}.json"
            with open(session_file, "w") as f:
                json.dump({"test": f"data-{i}"}, f)
        
        with patch("app.api.routes.browser.SESSION_DIR", temp_session_dir):
            response = client.get("/api/v1/browser/sessions")
            assert response.status_code == 200
            
            data = response.json()
            assert data["count"] == 3
            assert len(data["sessions"]) == 3
            assert "session-0" in data["sessions"]
            assert "session-1" in data["sessions"]
            assert "session-2" in data["sessions"]

    def test_delete_browser_session(self, client: TestClient, temp_session_dir: Path) -> None:
        """Test deleting a browser session.
        
        Args:
            client: Test client fixture
            temp_session_dir: Temporary directory for session files
        """
        # Create a test session file
        session_id = "test-session-to-delete"
        session_file = temp_session_dir / f"{session_id}.json"
        with open(session_file, "w") as f:
            json.dump({"test": "data"}, f)
        
        with patch("app.api.routes.browser.SESSION_DIR", temp_session_dir):
            # Verify session exists
            response = client.get("/api/v1/browser/sessions")
            assert response.status_code == 200
            assert session_id in response.json()["sessions"]
            
            # Delete session
            response = client.delete(f"/api/v1/browser/sessions/{session_id}")
            assert response.status_code == 200
            
            data = response.json()
            assert data["status"] == "success"
            assert f"Session {session_id} deleted successfully" in data["message"]
            
            # Verify session no longer exists
            response = client.get("/api/v1/browser/sessions")
            assert response.status_code == 200
            assert session_id not in response.json()["sessions"]

    def test_delete_nonexistent_browser_session(self, client: TestClient) -> None:
        """Test deleting a non-existent browser session.
        
        Args:
            client: Test client fixture
        """
        session_id = "nonexistent-session"
        
        response = client.delete(f"/api/v1/browser/sessions/{session_id}")
        assert response.status_code == 404
        
        data = response.json()
        assert f"Session {session_id} not found" in data["detail"]