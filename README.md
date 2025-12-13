🚀 SponsoPilot

Multi-recipient sponsorship outreach with personalized email automation.

SponsoPilot helps student organizations, event teams, and early-stage founders send high-converting sponsorship emails at scale — without expensive tools or complicated CRMs.

Built with Next.js 14, TypeScript, TailwindCSS, and Resend (free-tier friendly).

✨ Features
📬 Multi-Recipient Campaigns

Upload CSV / paste a list of companies

Supports fields like:

name

email

industry

notes

Sends one email per company using the Resend API

Progress indicator and delivery logs for each recipient

🧠 Smart Personalization

Email templates support variables such as:

[[Company Name]]

[[Company Industry]]

[[Notes]]

Each email is rendered with company-specific data before sending

🔍 Research Assistant

Paste a list of domains (e.g. brand.com, event.com)

Server route tries to extract public email addresses from those sites

Results are editable (name, email, notes)

“Add to Campaign Stash” to reuse contacts in campaigns

🔔 Delivery Logs

Shows success / failure for each email

Includes error messages from Resend if something goes wrong

Logs can be kept in the browser (localStorage)

Designed to be extended later to a database (e.g. Supabase)

💅 Modern UI

TailwindCSS styling with a soft dark theme and gradients

Card-based layout for “Campaign” and “Research” flows

Toast notifications for success/error states

🛠 Tech Stack
Layer	Tool / Library
Framework	Next.js 14 (App Router)
Language	TypeScript
Styling	TailwindCSS
Email	Resend API
Data (now)	Local state + localStorage
Data (later)	Supabase (Postgres)
📁 Project Structure (high level)
src/
 ├─ app/
 │   ├─ api/
 │   │   ├─ send-email/
 │   │   │    └─ route.ts        # Single + bulk campaign sending
 │   │   └─ extract-emails/
 │   │        └─ route.ts        # Research: extract public emails from domains
 │   ├─ lib/
 │   │   ├─ template.ts          # Template variable replacement helper
 │   │   └─ parseCompanies.ts    # CSV/TSV parsing for company lists
 │   ├─ page.tsx                 # Main UI (Campaign + Research tabs)
 │   └─ layout.tsx               # App layout (fonts, background, toasts)
 ├─ public/                      # Static assets
 ├─ README.md
 └─ PROJECT_PHASES.md            # Internal roadmap & dev phases (separate doc)

🔧 Getting Started
1. Clone the repository
git clone https://github.com/<your-username>/sponso-pilot.git
cd sponso-pilot

2. Install dependencies
npm install

3. Configure environment variables

Create a file called .env.local in the project root:

touch .env.local


Add your Resend API key:

RESEND_API_KEY=your_resend_api_key_here


You can create a free key from the Resend dashboard.

4. Run the development server
npm run dev


Then open:
👉 http://localhost:3000

📬 Email Sending Notes

SponsoPilot uses Resend to send emails.

On the free tier you can send a limited number of emails per day — great for testing.

For production use, it’s recommended to:

Verify your sending domain in Resend (SPF/DKIM/DMARC)

Use a domain-based From address (e.g. hello@yourdomain.com)

Avoid free mailbox senders like @gmail.com as the From address.

🤝 Contributing

Improvements, bug reports, and ideas are welcome!

Open an issue to discuss changes.

📜 License

This project is released under the MIT License.
You are free to use, modify, and distribute it for personal or commercial purposes.