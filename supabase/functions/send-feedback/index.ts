import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // In a real implementation, you would send an email here
    // For example, using a service like SendGrid, Mailgun, or AWS SES
    // Example with SendGrid (you would need to add the SendGrid SDK):
    // 
    // const sgMail = await import("npm:@sendgrid/mail");
    // sgMail.setApiKey(Deno.env.get("SENDGRID_API_KEY"));
    // await sgMail.send({
    //   to: "admin@chooseyourhard.co.uk",
    //   from: "noreply@chooseyourhard.co.uk",
    //   subject: `Feedback: ${subject}`,
    //   text: `Type: ${type}\nFrom: ${email}\nMessage: ${message}`,
    //   html: `<p><strong>Type:</strong> ${type}</p>
    //          <p><strong>From:</strong> ${email}</p>
    //          <p><strong>Message:</strong> ${message}</p>`,
    // });

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

// Import createClient from Supabase
import { createClient } from "npm:@supabase/supabase-js@2.50.4";