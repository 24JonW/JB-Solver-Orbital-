import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as matchers from '@testing-library/jest-dom/matchers';
import axios from 'axios'; 
import HomePage from './pages/HomePage'; 

// Extend Vitest expect assertions with Testing Library DOM matchers
expect.extend(matchers);

// Mock Axios network framework globally
vi.mock('axios'); 

const mockNavigate = vi.fn(); 
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the global layout top navigation bar component out of the suite environment
vi.mock("./pages/TopSectionBar", () => ({
  TopSectionBar: () => <div data-testid="top-bar">Top Bar</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.localStorage.setItem("userId", "1"); 

  // Intercept backend axios calls and return fake test data models
  axios.get.mockImplementation((url) => {
    if (url.includes('/api/accounts/')) {
      return Promise.resolve({
        data: { username: "John", email: "john@test.com", user_id: 1 }
      });
    }
    if (url.includes('/api/bills/outstanding/')) {
      return Promise.resolve({ data: [] });
    }
    if (url.includes('/api/bills/receivables/')) {
      return Promise.resolve({ data: [] });
    }
    return Promise.reject(new Error(`Unhandled API call to: ${url}`));
  });
});

describe('JBSolver Frontend Integration Suite', () => {
  it('should successfully render the sanity checking layout elements', () => {
    render(<div><h1>Welcome to JBSolver</h1></div>);
    const element = screen.getByText(/Welcome to JBSolver/i);
    expect(element).toBeInTheDocument();
  });

  it("should asynchronously load and display user profile values returned from the mocked API", async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    ); 
    
    // findByText waits for async updates to happen when Axios finishes resolution cycles
    const username = await screen.findByText(/Username:\s*John/i); 
    expect(username).toBeInTheDocument(); 
  });
});