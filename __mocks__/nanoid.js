// Mock nanoid for tests
module.exports = {
  customAlphabet: () => () => 'mock-token-123',
  nanoid: () => 'mock-id-123'
}