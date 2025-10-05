from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import httpx
import os
import asyncio
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
import json

load_dotenv()

app = FastAPI(title="Vapi Voice Agent API")

class Customer(BaseModel):
    number: str

class CallRequest(BaseModel):
    assistant_id: str
    phone_number_id: str
    customer: Customer
    metadata: Optional[Dict[str, Any]] = None
    variable_values: Optional[Dict[str, Any]] = None

class CallResponse(BaseModel):
    call_id: str
    status: str
    message: str

class TranscriptResponse(BaseModel):
    call_id: str
    status: str
    transcript: Optional[str] = None
    messages: Optional[list] = None
    cost: Optional[float] = None
    duration: Optional[float] = None

# In-memory storage for call data (in production, use a proper database)
call_data_store: Dict[str, Dict[str, Any]] = {}

@app.post("/make-call", response_model=CallResponse)
async def make_vapi_call(request: CallRequest):
    """
    Initiate an outbound call using Vapi with a custom prompt
    """
    vapi_token = os.getenv("VAPI_API_KEY")
    if not vapi_token:
        raise HTTPException(status_code=500, detail="VAPI_API_KEY not configured")

    vapi_payload = {
        "assistantId": request.assistant_id,
        "phoneNumberId": request.phone_number_id,
        "customer": {"number": request.customer.number}
    }

    if request.metadata:
        vapi_payload["metadata"] = request.metadata

    if request.variable_values:
        vapi_payload["assistantOverrides"] = {
            "variableValues": request.variable_values
        }

    headers = {
        "Authorization": f"Bearer {vapi_token}",
        "Content-Type": "application/json"
    }

    try:
        print(f"Sending payload to Vapi: {vapi_payload}")
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.vapi.ai/call/phone",
                json=vapi_payload,
                headers=headers,
                timeout=30.0
            )
            response.raise_for_status()

            call_data = response.json()

            return CallResponse(
                call_id=call_data.get("id", "unknown"),
                status=call_data.get("status", "initiated"),
                message=f"Call initiated to {request.customer.number}"
            )

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Vapi API error: {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate call: {str(e)}")

@app.get("/call/{call_id}/transcript", response_model=TranscriptResponse)
async def get_call_transcript(call_id: str):
    """
    Retrieve transcript and details for a completed call
    """
    vapi_token = os.getenv("VAPI_API_KEY")
    if not vapi_token:
        raise HTTPException(status_code=500, detail="VAPI_API_KEY not configured")

    headers = {
        "Authorization": f"Bearer {vapi_token}",
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.vapi.ai/call/{call_id}",
                headers=headers,
                timeout=30.0
            )
            response.raise_for_status()

            call_data = response.json()

            return TranscriptResponse(
                call_id=call_data.get("id", call_id),
                status=call_data.get("status", "unknown"),
                transcript=call_data.get("transcript"),
                messages=call_data.get("messages", []),
                cost=call_data.get("cost", 0),
                duration=call_data.get("durationSeconds")
            )

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Call not found")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Vapi API error: {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve call data: {str(e)}")

@app.get("/call/{call_id}/transcript/wait", response_model=TranscriptResponse)
async def wait_for_transcript(call_id: str, timeout: int = 120, poll_interval: int = 3):
    """
    Poll for transcript until available or timeout reached
    """
    vapi_token = os.getenv("VAPI_API_KEY")
    if not vapi_token:
        raise HTTPException(status_code=500, detail="VAPI_API_KEY not configured")

    headers = {
        "Authorization": f"Bearer {vapi_token}",
        "Content-Type": "application/json"
    }

    start_time = asyncio.get_event_loop().time()

    while True:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://api.vapi.ai/call/{call_id}",
                    headers=headers,
                    timeout=30.0
                )
                response.raise_for_status()

                call_data = response.json()
                status = call_data.get("status", "unknown")
                transcript = call_data.get("transcript")

                # Return if call is completed and has transcript
                if status == "ended" and transcript:
                    return TranscriptResponse(
                        call_id=call_data.get("id", call_id),
                        status=status,
                        transcript=transcript,
                        messages=call_data.get("messages", []),
                        cost=call_data.get("cost", 0),
                        duration=call_data.get("durationSeconds")
                    )

                # Return if call failed
                if status in ["failed", "no-answer", "busy"]:
                    return TranscriptResponse(
                        call_id=call_data.get("id", call_id),
                        status=status,
                        transcript=None,
                        messages=call_data.get("messages", []),
                        cost=call_data.get("cost", 0),
                        duration=call_data.get("durationSeconds")
                    )

                # Check timeout
                elapsed = asyncio.get_event_loop().time() - start_time
                if elapsed >= timeout:
                    raise HTTPException(
                        status_code=408,
                        detail=f"Timeout waiting for transcript after {timeout} seconds. Call status: {status}"
                    )

                # Wait before next poll
                await asyncio.sleep(poll_interval)

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise HTTPException(status_code=404, detail="Call not found")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Vapi API error: {e.response.text}"
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to retrieve call data: {str(e)}")

@app.post("/webhook/vapi")
async def vapi_webhook(request: Request):
    """
    Webhook endpoint to receive Vapi events including end-of-call reports
    """
    try:
        payload = await request.json()
        message_type = payload.get("message", {}).get("type")

        print(f"Received webhook: {message_type}")

        if message_type == "end-of-call-report":
            # Extract call data from end-of-call report
            call = payload.get("message", {}).get("call", {})
            call_id = call.get("id")

            if call_id:
                # Store complete call data
                call_data_store[call_id] = {
                    "id": call_id,
                    "status": call.get("status"),
                    "transcript": call.get("transcript"),
                    "messages": call.get("messages", []),
                    "cost": call.get("cost", 0),
                    "duration": call.get("durationSeconds"),
                    "artifacts": call.get("artifact", {}),
                    "analysis": call.get("analysis", {}),
                    "ended_reason": call.get("endedReason"),
                    "received_at": payload.get("message", {}).get("timestamp")
                }

                print(f"Stored call data for {call_id}: status={call.get('status')}")

        elif message_type == "transcript":
            # Handle real-time transcript updates
            transcript_data = payload.get("message", {})
            call_id = transcript_data.get("call", {}).get("id")

            if call_id:
                # Update or create call data with transcript
                if call_id not in call_data_store:
                    call_data_store[call_id] = {"id": call_id, "transcripts": []}

                if "transcripts" not in call_data_store[call_id]:
                    call_data_store[call_id]["transcripts"] = []

                call_data_store[call_id]["transcripts"].append({
                    "type": transcript_data.get("transcriptType"),
                    "role": transcript_data.get("role"),
                    "text": transcript_data.get("transcript"),
                    "timestamp": transcript_data.get("timestamp")
                })

                print(f"Added transcript for {call_id}: {transcript_data.get('transcript')[:50]}...")

        return {"status": "received"}

    except Exception as e:
        print(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")

@app.get("/call/{call_id}/transcript/webhook", response_model=TranscriptResponse)
async def get_transcript_from_webhook(call_id: str):
    """
    Get transcript from webhook-stored data (instant if available)
    """
    if call_id not in call_data_store:
        raise HTTPException(status_code=404, detail="Call not found in webhook data")

    call_data = call_data_store[call_id]

    return TranscriptResponse(
        call_id=call_data.get("id", call_id),
        status=call_data.get("status", "unknown"),
        transcript=call_data.get("transcript"),
        messages=call_data.get("messages", []),
        cost=call_data.get("cost", 0),
        duration=call_data.get("duration")
    )

@app.get("/calls/stored")
async def list_stored_calls():
    """
    List all calls received via webhooks
    """
    return {
        "calls": [
            {
                "call_id": call_id,
                "status": data.get("status"),
                "received_at": data.get("received_at"),
                "has_transcript": bool(data.get("transcript"))
            }
            for call_id, data in call_data_store.items()
        ]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8020)