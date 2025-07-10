import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.50.4";

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get request body
    const { type, subject, message, email, challengeId, challengeTitle, userId } = await req.json();

    // Validate inputs
    if (!subject || !message || !email) {
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

    // Get user details if userId is provided
    let userDetails = null;
    if (userId) {
      const { data: user, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
      if (!userError && user) {
        userDetails = user;
      }
    }

    // Store feedback in database for record-keeping
    const { data: feedbackRecord, error: feedbackError } = await supabaseClient
      .from("feedback")
      .insert({
        type,
        subject,
        message,
        email,
        challenge_id: challengeId,
        challenge_title: challengeTitle,
        user_id: userId,
        user_email: userDetails?.user?.email,
      })
      .select()
      .single();

    if (feedbackError) {
      console.error("Error storing feedback:", feedbackError);
    }

    // Send email using Email.js or another email service
    // This is where you would integrate with an email service
    // For now, we'll just log the email content and return success
    
    console.log("Email would be sent to: chooseyourharduk@gmail.com");
    console.log("Subject:", subject);
    console.log("From:", email);
    console.log("Message:", message);
    console.log("Type:", type);
    console.log("Challenge:", challengeId ? `${challengeTitle} (${challengeId})` : "N/A");
    console.log("User:", userId ? `${userDetails?.user?.email} (${userId})` : "Anonymous");

    // In a real implementation, you would send an actual email here
    // For example, using SendGrid, Mailgun, or another email service

    return new Response(
      JSON.stringify({
        success: true,
        message: "Feedback submitted successfully",
        id: feedbackRecord?.id,
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