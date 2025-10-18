import { NextRequest, NextResponse } from 'next/server';

// Define the interface for the Vapi call request
interface CallRequest {
  assistant_id: string;
  phone_number_id: string;
  customer: {
    number: string;
  };
  metadata?: Record<string, any>;
  variable_values?: Record<string, any>;
}

// Define the interface for the Vapi call response
interface CallResponse {
  call_id: string;
  status: string;
  message: string;
}

// Define the interface for the transcript response
interface TranscriptResponse {
  call_id: string;
  status: string;
  transcript?: string;
  messages?: any[];
  cost?: number;
  duration?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supplierInfo, productInfo } = body;

    if (!supplierInfo || !productInfo) {
      return NextResponse.json(
        { error: 'Missing required information: supplierInfo and productInfo' },
        { status: 400 }
      );
    }

    // Get Vapi configuration from environment variables
    const assistantId = process.env.VAPI_ASSISTANT_ID;
    const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
    const vapiToken = process.env.VAPI_TOKEN;

    if (!assistantId || !phoneNumberId || !vapiToken) {
      return NextResponse.json(
        { error: 'Vapi configuration missing' },
        { status: 500 }
      );
    }

    // Prepare the call request
    const callRequest: CallRequest = {
      assistant_id: assistantId,
      phone_number_id: phoneNumberId,
      customer: {
        number: supplierInfo.phone || supplierInfo.contact || "+1234567890" // Default fallback
      },
      metadata: {
        supplier_name: supplierInfo.name,
        products: JSON.stringify(productInfo)
      },
      variable_values: {
        supplier_name: supplierInfo.name,
        products: JSON.stringify(productInfo),
        negotiation_goals: "Get better pricing and terms for the listed products"
      }
    };

    // Make the call to Vapi API
    const response = await fetch('http://127.0.0.1:8020/make-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(callRequest)
    });

    if (!response.ok) {
      throw new Error(`Vapi API error: ${response.status} ${response.statusText}`);
    }

    const callData: CallResponse = await response.json();

    // Return the call ID and initial status
    return NextResponse.json({
      success: true,
      call_id: callData.call_id,
      status: callData.status,
      message: 'Negotiation call initiated successfully'
    });

  } catch (error) {
    console.error('Error initiating negotiation call:', error);
    return NextResponse.json(
      { error: 'Failed to initiate negotiation call' },
      { status: 500 }
    );
  }
}

// GET endpoint to check the status of a negotiation call
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('call_id');

    if (!callId) {
      return NextResponse.json(
        { error: 'Missing call_id parameter' },
        { status: 400 }
      );
    }

    const vapiToken = process.env.VAPI_TOKEN;

    if (!vapiToken) {
      return NextResponse.json(
        { error: 'Vapi configuration missing' },
        { status: 500 }
      );
    }

    // Get the transcript from Vapi API
    const response = await fetch(`http://127.0.0.1:8020/call/${callId}/transcript`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${vapiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Vapi API error: ${response.status} ${response.statusText}`);
    }

    const transcriptData: TranscriptResponse = await response.json();

    return NextResponse.json({
      success: true,
      call_id: callId,
      status: transcriptData.status,
      transcript: transcriptData.transcript,
      messages: transcriptData.messages,
      cost: transcriptData.cost,
      duration: transcriptData.duration
    });

  } catch (error) {
    console.error('Error fetching negotiation status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch negotiation status' },
      { status: 500 }
    );
  }
}