# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a market research survey application built with Next.js and SurveyJS, using Supabase as the backend. It allows administrators to create and manage surveys while providing a clean interface for respondents to complete them.

## Essential Commands

```bash
# Development
npm install          # Install dependencies
npm run dev          # Start development server on port 3003
npm run build        # Build for production
npm run start        # Start production server

# Database Setup
# Run the SQL in update-survey.sql directly in Supabase SQL editor
```

## Architecture

### Tech Stack
- **Next.js 15.1.8** with Pages Router (not App Router)
- **TypeScript** for type safety
- **SurveyJS** for survey rendering and data collection
- **Supabase** for database and authentication
- **Papaparse** for CSV export functionality

### Key Directories
- `/pages` - Next.js pages including API routes
- `/pages/admin` - Admin dashboard for survey management
- `/pages/survey/[id].tsx` - Dynamic survey display page
- `/lib/supabase.ts` - Supabase client initialization
- `/types/survey.ts` - TypeScript interfaces
- `/surveys` - Sample survey JSON configurations

### Database Schema
Two main tables:
1. `surveys` - Stores survey definitions with JSON schema
2. `survey_responses` - Stores responses with optional contact info

### Environment Variables
Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Key Workflows

### Adding a New Survey
1. Create JSON definition following the format in `/surveys` directory
2. Use admin dashboard at `/admin/create` to add to database
3. Survey will be accessible at `/survey/{survey-id}`

### Modifying Survey Structure
1. Update the TypeScript interfaces in `/types/survey.ts`
2. Modify database schema if needed
3. Update relevant components

### Working with Responses
- View responses in admin dashboard at `/admin`
- Export as CSV using the export button
- Responses include optional email/phone fields

## Important Notes

- The application runs on port 3003 (configured in package.json)
- All surveys use SurveyJS JSON schema format
- Anonymous responses are supported (contact info is optional)
- The admin interface has no authentication (add before production use)
- Survey IDs in URLs use slugs derived from survey titles
- Safari/iOS localStorage handling is implemented with error handling to prevent issues in Private Browsing mode
- Survey progress is saved both locally (when available) and to the server (every 5 seconds)