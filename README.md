# Market Research Survey Application

A Next.js application for creating and managing surveys using SurveyJS and Supabase.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Run the following SQL to create the required tables:

```sql
-- Create surveys table
CREATE TABLE IF NOT EXISTS surveys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  json_schema JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create survey_responses table
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES surveys(id),
  response_data JSONB NOT NULL,
  respondent_email VARCHAR(255),
  respondent_name VARCHAR(255),
  respondent_address TEXT,
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_created_at ON survey_responses(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_survey_responses_updated_at BEFORE UPDATE
ON survey_responses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
```

### 3. Configure Environment Variables

1. Copy your Supabase project URL and anon key from the Supabase dashboard
2. Update `.env.local` with your credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Features

- **Public Survey Page**: Users can take available surveys
- **Admin Dashboard**: Create and manage surveys
- **CSV Export**: Export survey responses for analysis
- **Anonymous Responses**: Optional contact information collection

## Project Structure

- `/pages` - Next.js pages
  - `/survey/[id].tsx` - Dynamic survey page
  - `/admin` - Admin dashboard pages
- `/lib` - Utility functions and Supabase client
- `/types` - TypeScript type definitions
- `/surveys` - Sample survey JSON schemas

## Deployment to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add your environment variables in Vercel project settings
4. Deploy!

## Usage

1. **Creating Surveys**: Go to `/admin` and click "Create New Survey"
2. **Taking Surveys**: Surveys appear on the home page when active
3. **Exporting Data**: Use the "Export CSV" button in the admin dashboard
4. **Analyzing Data**: Import the CSV into Claude for detailed analysis