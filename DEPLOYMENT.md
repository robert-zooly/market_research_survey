# Deployment Guide

## Quick Start for Vercel Deployment

### 1. Environment Variables

Set these in Vercel dashboard under Settings → Environment Variables:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ADMIN_PASSWORD=your_secure_password

# For Production Email Sending
NEXT_PUBLIC_MAILGUN_API_KEY=your_mailgun_api_key
NEXT_PUBLIC_MAILGUN_DOMAIN=send.getzooly.com
```

### 2. Domain Setup

#### Option A: Subdomain (Recommended)
1. In Vercel: Add domain `survey.getzooly.com`
2. In your DNS: Add CNAME record
   ```
   survey.getzooly.com → cname.vercel-dns.com
   ```

#### Option B: Path-based
Not recommended - requires additional configuration

### 3. Admin Access

The admin dashboard is protected with basic authentication:
- URL: `https://survey.getzooly.com/admin`
- Username: Can be anything (e.g., "admin")
- Password: The value you set for `ADMIN_PASSWORD`

To access admin:
1. Go to `/admin-login` for a nice login page
2. Or go directly to `/admin` and use browser's basic auth prompt

### 4. Database Setup

Run the SQL scripts in Supabase:
1. `update-survey.sql` - Initial tables
2. `database/invitation-schema.sql` - Email invitation system

### 5. Mailgun Setup

For production emails:
1. Verify domain in Mailgun
2. Update DNS records (SPF, DKIM)
3. Switch from sandbox to production domain

### 6. Post-Deployment Checklist

- [ ] Test survey access at main URL
- [ ] Verify admin login works
- [ ] Send test email from `/admin/test-email`
- [ ] Upload small test batch and verify timezone scheduling
- [ ] Check email deliverability

## Security Notes

- Change `ADMIN_PASSWORD` regularly
- Consider implementing full authentication after launch
- Monitor Mailgun for bounce rates
- Set up Supabase Row Level Security for production