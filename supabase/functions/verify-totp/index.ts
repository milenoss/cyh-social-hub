import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.50.3";
import * as OTPAuth from "npm:otpauth@9.2.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyemh5dm1iaWp5d3ptbHl6cG5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk4MjI2NCwiZXhwIjoyMDY3NTU4MjY0fQ.0m5deTRSqR-wztAYFyE9HoPzH0sIzIIoMmA4DyysBVc",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get request body
    const { token, secret, userId } = await req.json();

    // Validate inputs
    if (!token || !secret || !userId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required parameters",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Verify TOTP token
    const totp = new OTPAuth.TOTP({
      issuer: "ChooseYourHard",
      label: "user",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const isValid = totp.validate({ token, window: 1 });

    if (!isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid verification code",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Generate recovery codes
    const recoveryCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 6) + "-" +
      Math.random().toString(36).substring(2, 6) + "-" +
      Math.random().toString(36).substring(2, 6)
    );

    // Update user security settings
    const { data, error } = await supabaseClient.rpc("enable_two_factor", {
      secret,
      recovery_codes: recoveryCodes,
    });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Two-factor authentication enabled successfully",
        recoveryCodes,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "An error occurred",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});