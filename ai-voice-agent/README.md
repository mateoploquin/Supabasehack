# Vapi Voice Agent API

FastAPI endpoint that integrates with Vapi to initiate outbound phone calls with dynamic variables support.

## Setup

1. Install dependencies:
```bash
uv sync
```

2. Set up environment:
```bash
cp .env.example .env
# Add your VAPI_API_KEY to .env
```

3. Run the server:
```bash
uv run python main.py
```

Server runs on `http://localhost:8020`

## API Endpoints

### POST /make-call

Initiates an outbound call using Vapi with dynamic variables support.

**Request Body:**
```json
{
  "assistant_id": "your-assistant-id",
  "phone_number_id": "your-phone-number-id",
  "customer": {"number": "+1234567890"},
  "metadata": {"campaign": "demo", "first_name": "John"},
  "variable_values": {
    "name": "John",
    "company": "TechCorp",
    "appointment_time": "3 PM today"
  }
}
```

**Response:**
```json
{
  "call_id": "call-id-from-vapi",
  "status": "queued",
  "message": "Call initiated to +1234567890"
}
```

### GET /health

Health check endpoint.

## Dynamic Variables

Use dynamic variables in your assistant's system prompt with double curly braces:
- `{{name}}` - replaced with variable_values.name
- `{{company}}` - replaced with variable_values.company
- `{{customer.number}}` - automatically filled with phone number

**Example:**
Assistant prompt: "Hello {{name}}, this is a call from {{company}} regarding your appointment at {{appointment_time}}."

## Example Usage

```bash
curl -X POST http://localhost:8020/make-call \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": "ba50937e-7bf8-44ce-85f5-d5debe02e012",
    "phone_number_id": "03cebed7-dc0d-495e-af46-7643a65f3293",
    "customer": {"number": "+15108335275"},
    "variable_values": {
      "name": "Alex",
      "company": "TechCorp"
    }
  }'
```