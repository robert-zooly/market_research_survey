// Mock Supabase client for testing
const createMockChain = () => {
  const chain: any = {
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  }
  
  // Make each method return the chain
  Object.keys(chain).forEach(key => {
    chain[key].mockReturnValue(chain)
  })
  
  return chain
}

export const supabase = {
  from: jest.fn((table: string) => createMockChain()),
  rpc: jest.fn(),
}

// Helper to setup mock responses
export const setupSupabaseMock = (table: string, method: string, response: any) => {
  const mockChain = supabase.from(table)
  
  // Setup the chain to return our response
  if (method === 'select') {
    mockChain.select = jest.fn().mockReturnValue({
      ...mockChain,
      data: response.data,
      error: response.error
    })
  } else if (method === 'insert') {
    mockChain.insert = jest.fn().mockReturnValue({
      ...mockChain,
      select: jest.fn().mockReturnValue({
        ...mockChain,
        single: jest.fn().mockResolvedValue(response)
      })
    })
  }
  
  return mockChain
}