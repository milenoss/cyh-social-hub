import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const { type, subject, message, email, challenge_id, challenge_title, user_id, user_email } = await req.json();

    // Validate required fields
    if (!type || !subject || !message || !email) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required fields",
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

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyemh5dm1iaWp5d3ptbHl6cG5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk4MjI2NCwiZXhwIjoyMDY3NTU4MjY0fQ.0m5deTRSqR-wztAYFyE9HoPzH0sIzIIoMmA4DyysBVc",
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Store feedback in the database
    const { data, error } = await supabaseClient
      .from("feedback")
      .insert({
        type,
        subject,
        message,
        email,
        challenge_id,
        challenge_title,
        user_id,
        user_email,
      })
      .select()
      .single();

    if (error) throw error;

    try {
      // Send email notification using Supabase Edge Function
      // This is a placeholder for email functionality without Mailchimp
      console.log("Feedback received:", {
        type,
        subject,
        email,
        message,
        challenge_id,
        challenge_title,
        user_id,
        user_email
      });
      
      // In a real implementation, you would use a different email service here
      // For example, you could use SendGrid, AWS SES, or another email service
    } catch (mailchimpError) {
      console.error("Error sending email notification:", JSON.stringify(mailchimpError));
      // Continue execution - we don't want to fail the feedback submission if just the email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Feedback submitted successfully",
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