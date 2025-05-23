import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // This SQL will create the tables if they don't exist
    const createTables = `
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
    `

    // Note: Supabase doesn't allow direct SQL execution via the JS client
    // You'll need to run this SQL in the Supabase dashboard SQL editor
    
    res.status(200).json({ 
      message: 'Database setup SQL generated. Please run the following SQL in your Supabase dashboard:',
      sql: createTables
    })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Failed to generate setup SQL' })
  }
}