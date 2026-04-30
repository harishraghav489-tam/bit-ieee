import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { event_id, otp_type, expires_in = 60 } = await req.json();

    if (!event_id || !otp_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service role to bypass RLS for this operation if needed, or normal key if RLS allows
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate a 6-character random alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let otpCode = '';
    for (let i = 0; i < 6; i++) {
      otpCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Deactivate existing active OTPs for this event and type
    await supabase
      .from("otps")
      .update({ is_active: false })
      .eq("event_id", event_id)
      .eq("otp_type", otp_type)
      .eq("is_active", true);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expires_in);

    const { data, error } = await supabase
      .from("otps")
      .insert({
        event_id,
        otp_type,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        is_active: true
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, otp: data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
