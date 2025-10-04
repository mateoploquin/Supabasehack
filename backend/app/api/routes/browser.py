"""Browser automation API routes module.

Provides endpoints for browser automation using the browser-use library
with Google Gemini AI integration. These endpoints allow for programmatic
control of web browsers for tasks like web scraping and form filling.
"""

import json
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.log_config import logger

router = APIRouter(prefix="/browser", tags=["browser"])

# Directory for storing browser session data
SESSION_DIR = Path("browser_sessions")
SESSION_DIR.mkdir(exist_ok=True)


class BrowserTaskRequest(BaseModel):
    """Request model for browser automation tasks.
    
    Defines the input parameters for browser automation tasks,
    including the task description and optional configuration.
    """
    task: str = Field(
        ..., 
        description="The task to perform using browser automation",
        min_length=1,
        max_length=1000,
        examples=["Search for 'browser automation with Python' on Google"]
    )
    max_steps: int = Field(
        default=50,
        description="Maximum number of steps the agent should take",
        ge=1,
        le=100
    )
    include_screenshot: bool = Field(
        default=True,
        description="Whether to include screenshots in the response"
    )
    session_id: str | None = Field(
        default=None,
        description="Session ID to reuse an existing browser session",
        examples=["550e8400-e29b-41d4-a716-446655440000"]
    )
    save_session: bool = Field(
        default=True,
        description="Whether to save the browser session for future use"
    )
    system_prompt: str | None = Field(
        default=None,
        description="Custom system prompt to override the default agent behavior",
        max_length=5000,
        examples=["You are a helpful assistant that specializes in web scraping. Always extract data in JSON format."]
    )
    extend_system_prompt: str | None = Field(
        default=None,
        description="Additional text to extend the default system prompt",
        max_length=5000,
        examples=["Always double-check your work before completing the task."]
    )


class BrowserTaskResponse(BaseModel):
    """Response model for browser automation tasks.
    
    Defines the output format for browser automation task results,
    including execution status and results.
    """
    success: bool = Field(
        ..., 
        description="Whether the task was completed successfully"
    )
    result: dict[str, Any] = Field(
        default_factory=dict,
        description="The result of the browser automation task"
    )
    final_message: str = Field(
        ..., 
        description="The final message from the agent describing the task outcome"
    )
    steps_taken: int = Field(
        ..., 
        description="Number of steps taken by the agent"
    )
    session_id: str | None = Field(
        default=None,
        description="Session ID for the browser session (if saved)"
    )


def save_browser_session(session_id: str, agent: Any) -> None:
    """Save browser session state to disk.
    
    Args:
        session_id: Unique identifier for the session
        agent: The browser agent instance
    """
    try:
        session_file = SESSION_DIR / f"{session_id}.json"
        session_data = {
            "cookies": agent.browser_context.cookies() if hasattr(agent, 'browser_context') else [],
            "local_storage": agent.browser_context.local_storage() if hasattr(agent, 'browser_context') else {},
            "session_storage": agent.browser_context.session_storage() if hasattr(agent, 'browser_context') else {},
        }
        
        with session_file.open("w") as f:
            json.dump(session_data, f, indent=2)
            
        logger.info(f"Browser session saved: {session_id}")
    except Exception as e:
        logger.error(f"Failed to save browser session {session_id}: {e!s}")


def load_browser_session(session_id: str) -> dict[str, Any] | None:
    """Load browser session state from disk.
    
    Args:
        session_id: Unique identifier for the session
        
    Returns:
        Dictionary containing session data, or None if not found
    """
    try:
        session_file = SESSION_DIR / f"{session_id}.json"
        if not session_file.exists():
            return None
            
        with session_file.open() as f:
            session_data = json.load(f)
            
        logger.info(f"Browser session loaded: {session_id}")
        return session_data
    except Exception as e:
        logger.error(f"Failed to load browser session {session_id}: {e!s}")
        return None


@router.post("/run-task", response_model=BrowserTaskResponse)
async def run_browser_task(request: BrowserTaskRequest) -> BrowserTaskResponse:
    """Execute a browser automation task.
    
    This endpoint uses the browser-use library with Google Gemini AI
    to perform browser automation tasks. The agent will navigate websites,
    interact with elements, and complete the specified task.
    
    Args:
        request: The browser task request containing task description and options
        
    Returns:
        BrowserTaskResponse: The result of the browser automation task
        
    Raises:
        HTTPException: If the Google API key is not configured or if task execution fails
    """
    # Check if Google API key is configured
    if not settings.GOOGLE_API_KEY:
        logger.error("Google API key not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google API key not configured. Please set GOOGLE_API_KEY in your environment."
        )
    
    # Generate or use existing session ID
    session_id = request.session_id
    if not session_id and request.save_session:
        session_id = str(uuid.uuid4())
    
    try:
        # Import browser-use components here to avoid import errors if not installed
        from browser_use import Agent, ChatGoogle
        
        # Initialize the Google Gemini model
        llm = ChatGoogle(model="gemini-flash-latest", api_key=settings.GOOGLE_API_KEY)
        
        # Load existing session if provided
        browser_context = None
        if session_id:
            session_data = load_browser_session(session_id)
            if session_data:
                # Create browser context with saved session data
                browser_context = {
                    "cookies": session_data.get("cookies", []),
                    "local_storage": session_data.get("local_storage", {}),
                    "session_storage": session_data.get("session_storage", {}),
                }
        
        # Create the agent with the specified task
        agent = Agent(
            task=f"""You are the **Procurement Sourcing Analyst** for our company. Your task is to identify potential providers for the specified product, gather pricing details, and recommend the best option by lowest total cost while respecting all constraints supplied in the user message.

### Core Objectives
- Understand the product requirements, quantity, quality specifications, delivery needs, region constraints, and any preferred marketplaces provided by the user.
- Perform thorough provider discovery via the channels allowed to you (e.g., web search APIs, internal catalogs, or supplied lists).
- Record each viable provider with: company name, product match notes, unit price, currency, additional fees (shipping, taxes, duties), lead time, reliability indicators (e.g., ratings, certifications), and the data source link/reference.
- Normalize all pricing into the requested comparison currency (or clearly state if conversion data is missing) and compute total landed cost per provider for the requested quantity.
- Highlight assumptions, missing data, or risks (availability, MOQ, compliance) for transparency.
- Produce a concise comparison table followed by an explicit recommendation of the lowest total cost option that satisfies requirements.
- Request clarification from the user if information is insufficient to perform an accurate comparison.

### Guardrails
- Never fabricate providers, prices, or links—only report verifiable data from accessible sources.
- If no suitable providers are found, clearly state this and suggest next steps or additional data needed.
- Do not contact any provider; limit output to research and recommendation.

### Output Format
1. **Summary** of search scope and key findings.
2. **Comparison Table** with columns: Provider, Product Match Notes, Unit Price, Est. Total Cost, Lead Time, Source.
3. **Recommendation** stating the top choice and rationale centered on price and requirement fit.
4. **Open Questions / Follow-ups** capturing any clarifications needed from the user.

Follow the users Request:
{request.task}""",
            llm=llm,
            browser_context=browser_context,
        )
        
        # Run the agent with the specified maximum steps
        logger.info(f"Starting browser automation task: {request.task[:100]}...")
        history = await agent.run(max_steps=request.max_steps)
        
        # Get the final result and message from the agent
        final_result = history.final_result() if hasattr(history, 'final_result') else None
        final_message = final_result if final_result else "Task completed with no specific result"
        
        # Extract additional results from the agent history
        result_data = {
            "final_result": final_result,
            "errors": history.errors() if hasattr(history, 'errors') else [],
            "urls_visited": history.urls() if hasattr(history, 'urls') else [],
        }
        
        # Include screenshot data if requested and available
        if request.include_screenshot and hasattr(history, 'screenshots'):
            result_data["screenshots"] = history.screenshots()
        
        # Get the number of steps taken
        steps_taken = len(history.history) if hasattr(history, 'history') else 0
        
        # Save session if requested
        if request.save_session and session_id:
            save_browser_session(session_id, agent)
        
        logger.info(f"Browser automation task completed in {steps_taken} steps")
        
        return BrowserTaskResponse(
            success=True,
            result=result_data,
            final_message=final_message,
            steps_taken=steps_taken,
            session_id=session_id if request.save_session else None
        )
        
    except ImportError as e:
        logger.error(f"Failed to import browser-use library: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Browser automation library not available. Please ensure browser-use is properly installed."
        ) from None
    except Exception as e:
        logger.error(f"Error executing browser automation task: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute browser automation task: {e!s}"
        ) from None


@router.get("/status")
async def get_browser_status() -> dict[str, str]:
    """Get the status of the browser automation service.
    
    Returns information about the browser automation service,
    including whether it's properly configured.
    
    Returns:
        Dict[str, str]: Status information
    """
    return {
        "status": "ready" if settings.GOOGLE_API_KEY else "not_configured",
        "message": "Browser automation service is ready" if settings.GOOGLE_API_KEY else "Google API key not configured"
    }


@router.get("/sessions")
async def list_browser_sessions() -> dict[str, Any]:
    """List all saved browser sessions.
    
    Returns a list of all saved browser session IDs.
    
    Returns:
        Dict[str, Any]: List of session IDs and count
    """
    try:
        session_files = list(SESSION_DIR.glob("*.json"))
        session_ids = [f.stem for f in session_files]
        
        return {
            "sessions": session_ids,
            "count": len(session_ids)
        }
    except Exception as e:
        logger.error(f"Error listing browser sessions: {e!s}")
        return {
            "sessions": [],
            "count": 0
        }


@router.delete("/sessions/{session_id}")
async def delete_browser_session(session_id: str) -> dict[str, str]:
    """Delete a saved browser session.
    
    Args:
        session_id: The ID of the session to delete
        
    Returns:
        Dict[str, str]: Status message
    """
    try:
        session_file = SESSION_DIR / f"{session_id}.json"
        if session_file.exists():
            session_file.unlink()
            logger.info(f"Browser session deleted: {session_id}")
            return {"status": "success", "message": f"Session {session_id} deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting browser session {session_id}: {e!s}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete session: {e!s}"
        ) from e