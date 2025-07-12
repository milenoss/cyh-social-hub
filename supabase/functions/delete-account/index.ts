import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.50.3";

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
    const { userId, reason } = await req.json();

    // Validate inputs
    if (!userId) {
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

    // Get user details
    const { data: user, error: userError } = await supabaseClient.auth.admin.getUserById(userId);

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "User not found",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Create deletion request
    const { data, error } = await supabaseClient
      .from("account_deletion_requests")
      .insert({
        user_id: userId,
        reason,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // In a real implementation, you might want to:
    // 1. Send an email to the user confirming the deletion request
    // 2. Schedule the actual deletion for a future date (e.g., 14 days)
    // 3. Provide a way for the user to cancel the deletion

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account deletion request submitted successfully",
        data,
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