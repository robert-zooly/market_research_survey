# Test Documentation

## Overview

This document describes the comprehensive test suite for the Market Research Survey application. The tests cover unit testing, integration testing, component testing, and end-to-end workflows.

## Test Structure

```
__tests__/
├── lib/                    # Unit tests for utility functions
│   ├── timezone-scheduler.test.ts
│   ├── email-service.test.ts
│   └── invitations.test.ts
├── api/                    # Integration tests for API endpoints
│   ├── unsubscribe.test.ts
│   └── send-email.test.ts
├── components/             # Component tests
│   └── LogoutButton.test.tsx
├── pages/                  # Page component tests
│   └── unsubscribe.test.tsx
└── e2e/                    # End-to-end workflow tests
    ├── survey-workflow.test.ts
    └── email-invitation-workflow.test.ts

__mocks__/
└── supabase.ts            # Mock Supabase client
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test timezone-scheduler.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should send email"
```

## Test Categories

### 1. Unit Tests

#### Timezone Scheduler (`timezone-scheduler.test.ts`)
- Tests timezone calculations for scheduling emails at 9am local time
- Verifies proper handling of daylight saving time
- Tests filtering of unsubscribed users
- Validates timezone grouping and sorting

#### Email Service (`email-service.test.ts`)
- Tests email template generation for initial and reminder emails
- Verifies unsubscribe filtering in batch sends
- Tests error handling and retry logic
- Validates rate limiting behavior

#### Invitation Management (`invitations.test.ts`)
- Tests batch creation and invitation generation
- Verifies global unsubscribe list checking
- Tests status updates (sent, opened, completed)
- Validates database operations

### 2. Integration Tests

#### Unsubscribe API (`unsubscribe.test.ts`)
- Tests successful unsubscribe flow
- Validates token verification
- Tests error handling for invalid tokens
- Verifies global unsubscribe list updates

#### Send Email API (`send-email.test.ts`)
- Tests Mailgun integration
- Validates email tracking setup
- Tests database status updates
- Verifies error handling

### 3. Component Tests

#### LogoutButton (`LogoutButton.test.tsx`)
- Tests render and styling
- Validates logout flow
- Tests error handling
- Prevents multiple simultaneous logouts

#### Unsubscribe Page (`unsubscribe.test.tsx`)
- Tests loading states
- Validates success/error UI
- Tests API integration
- Verifies redirect link to getzooly.com

### 4. End-to-End Tests

#### Survey Workflow (`survey-workflow.test.ts`)
Complete flow testing:
1. User clicks invitation link
2. Survey loads with prepopulated data
3. User completes and submits survey
4. Post-submission tracking and statistics update

#### Email Invitation Workflow (`email-invitation-workflow.test.ts`)
Complete flow testing:
1. CSV upload and batch creation
2. Timezone-based scheduling
3. Email sending in batches
4. Unsubscribe handling
5. Follow-up reminder scheduling

## Test Coverage Goals

- **Unit Tests**: 90%+ coverage for utility functions
- **Integration Tests**: All API endpoints covered
- **Component Tests**: Critical UI components tested
- **E2E Tests**: Major user workflows validated

## Mocking Strategy

### Supabase Mock
- Custom mock in `__mocks__/supabase.ts`
- Chainable API matching real Supabase client
- Helper functions for setting up test data

### External Services
- Mailgun API: Mocked via fetch
- Next.js Router: Mocked for navigation testing
- Browser APIs: localStorage, fetch mocked in setup

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clear Test Names**: Describe what is being tested
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Mock External Dependencies**: Don't make real API calls
5. **Test Edge Cases**: Include error scenarios
6. **Use Test Data Builders**: Create reusable test data

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test -- --coverage --ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## Debugging Tests

### Common Issues

1. **Async Test Failures**
   ```typescript
   // Use waitFor for async operations
   await waitFor(() => {
     expect(screen.getByText('Success')).toBeInTheDocument()
   })
   ```

2. **Mock Not Working**
   ```typescript
   // Clear mocks between tests
   beforeEach(() => {
     jest.clearAllMocks()
   })
   ```

3. **Environment Variables**
   ```typescript
   // Set in jest.setup.js
   process.env.NEXT_PUBLIC_SUPABASE_URL = 'test-url'
   ```

### Debug Commands

```bash
# Run single test with debugging
node --inspect-brk node_modules/.bin/jest --runInBand path/to/test.ts

# Verbose output
npm test -- --verbose

# Show test coverage gaps
npm run test:coverage -- --collectCoverageFrom='lib/**/*.ts'
```

## Future Improvements

1. **Visual Regression Testing**: Add screenshot testing for UI components
2. **Performance Testing**: Add tests for response times
3. **Accessibility Testing**: Add jest-axe for a11y validation
4. **Load Testing**: Test email batch sending at scale
5. **Security Testing**: Add tests for authentication and authorization

## Maintenance

- Review and update tests when features change
- Keep test data realistic and up-to-date
- Monitor test execution time and optimize slow tests
- Regularly update testing dependencies