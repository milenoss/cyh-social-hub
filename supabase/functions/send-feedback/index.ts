import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import mailchimp from "npm:@mailchimp/mailchimp_marketing@3.0.80";

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
    const mailchimpApiKey = Deno.env.get("MAILCHIMP_API_KEY") || "161ee575fa487a7fc314be2879414e49-us5";
    const mailchimpServerPrefix = mailchimpApiKey.split('-')[1]; // Extract 'us5' from the API key
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Initialize Mailchimp
    mailchimp.setConfig({
      apiKey: mailchimpApiKey,
      server: mailchimpServerPrefix,
    });

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
      // Create an email campaign using Mailchimp
      const campaignResponse = await mailchimp.campaigns.create({
        type: "regular",
        recipients: {
          list_id: "your-audience-list-id", // You'll need to replace this with your actual list ID
          segment_opts: {
            match: "all",
            conditions: [{
              condition_type: "EmailAddress",
              op: "is",
              field: "EMAIL",
              value: "chooseyourharduk@gmail.com" // The admin email that will receive feedback
            }]
          }
        },
        settings: {
          subject_line: `Feedback: ${subject}`,
          title: `Feedback from ${email}`,
          from_name: "Choose Your Hard Feedback",
          reply_to: email,
          auto_footer: false
        }
      });
      
      // Set the content for the campaign
      const contentResponse = await mailchimp.campaigns.setContent(campaignResponse.id, {
        html: `
          <h2>New Feedback Submission</h2>
          <p><strong>Type:</strong> ${type}</p>
          <p><strong>From:</strong> ${email}</p>
          ${challenge_id ? `<p><strong>Challenge:</strong> ${challenge_title} (${challenge_id})</p>` : ''}
          ${user_id ? `<p><strong>User ID:</strong> ${user_id}</p>` : ''}
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `
      });
      
      // Send the campaign
      await mailchimp.campaigns.send(campaignResponse.id);
      
      console.log("Email sent successfully via Mailchimp");
    } catch (mailchimpError) {
      console.error("Error sending email via Mailchimp:", mailchimpError);
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

// Import createClient from Supabase
import { createClient } from "npm:@supabase/supabase-js@2.50.4";