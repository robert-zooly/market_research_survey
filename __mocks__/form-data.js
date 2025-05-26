// Mock form-data for tests
class MockFormData {
  constructor() {
    this.data = {}
  }
  
  append(key, value) {
    this.data[key] = value
  }
  
  getHeaders() {
    return {
      'content-type': 'multipart/form-data; boundary=----formdata-mock-boundary'
    }
  }
}

module.exports = MockFormData