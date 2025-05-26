// Mock Supabase client for testing
const createMockChain = () => {
  const chain: any = {
    data: null,
    error: null
  }
  
  // Define all chainable methods
  const methods = ['insert', 'update', 'select', 'eq', 'in', 'is', 'not', 'lte', 'order', 'single', 'limit']
  
  methods.forEach(method => {
    chain[method] = jest.fn(() => chain)
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